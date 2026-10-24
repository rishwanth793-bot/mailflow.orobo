import { Router, Request, Response } from 'express';
import { db, seedSampleData } from './db.js';
import { sendAnnouncementBatch, sendTestEmail, getEmailProviderStatus } from './email.js';
import { generateSubjectSuggestions, polishAnnouncementContent } from './gemini.js';

export const apiRouter = Router();

// ==========================================
// Health & Diagnostic
// ==========================================
apiRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const check = await db.execute('SELECT 1 as alive');
    const providerStatus = await getEmailProviderStatus();
    res.json({
      status: 'healthy',
      database: check.rows.length > 0 ? 'connected' : 'error',
      emailProvider: providerStatus,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// ==========================================
// Dashboard Stats
// ==========================================
apiRouter.get('/dashboard/stats', async (_req: Request, res: Response) => {
  try {
    const [groupsRes, membersRes, announcementsRes, deliveriesRes, recentRes] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM groups'),
      db.execute('SELECT COUNT(*) as count FROM members'),
      db.execute("SELECT COUNT(*) as count FROM announcements WHERE status != 'draft'"),
      db.execute(`
        SELECT 
          COALESCE(SUM(success_count), 0) as successful,
          COALESCE(SUM(failure_count), 0) as failed
        FROM announcements
      `),
      db.execute(`
        SELECT 
          a.id, a.title, a.subject, a.recipient_count, a.success_count, a.failure_count,
          a.status, a.created_at, a.sent_at,
          g.name as group_name
        FROM announcements a
        LEFT JOIN groups g ON a.group_id = g.id
        ORDER BY a.created_at DESC
        LIMIT 6
      `),
    ]);

    const stats = {
      totalGroups: Number(groupsRes.rows[0]?.count || 0),
      totalMembers: Number(membersRes.rows[0]?.count || 0),
      announcementsSent: Number(announcementsRes.rows[0]?.count || 0),
      successfulDeliveries: Number(deliveriesRes.rows[0]?.successful || 0),
      failedDeliveries: Number(deliveriesRes.rows[0]?.failed || 0),
      recentAnnouncements: recentRes.rows.map(row => ({
        id: row.id,
        title: row.title,
        subject: row.subject,
        groupName: row.group_name || 'All Members',
        recipientCount: Number(row.recipient_count || 0),
        successCount: Number(row.success_count || 0),
        failureCount: Number(row.failure_count || 0),
        status: row.status,
        createdAt: row.created_at,
        sentAt: row.sent_at,
      })),
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Groups CRUD
// ==========================================
apiRouter.get('/groups', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        g.id, g.name, g.description, g.created_at, g.updated_at,
        COUNT(gm.member_id) as member_count
      FROM groups g
      LEFT JOIN group_memberships gm ON g.id = gm.group_id
      GROUP BY g.id
      ORDER BY g.name ASC
    `;
    const result = await db.execute(query);
    const groups = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      memberCount: Number(r.member_count || 0),
    }));
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/groups', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const id = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO groups (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, name.trim(), (description || '').trim(), now, now],
    });

    res.status(201).json({
      id,
      name: name.trim(),
      description: (description || '').trim(),
      createdAt: now,
      updatedAt: now,
      memberCount: 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const groupRes = await db.execute({
      sql: 'SELECT * FROM groups WHERE id = ?',
      args: [id],
    });

    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membersRes = await db.execute({
      sql: `
        SELECT m.id, m.full_name, m.email, m.role, gm.joined_at
        FROM members m
        JOIN group_memberships gm ON m.id = gm.member_id
        WHERE gm.group_id = ?
        ORDER BY m.full_name ASC
      `,
      args: [id],
    });

    const group = groupRes.rows[0];
    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      memberCount: membersRes.rows.length,
      members: membersRes.rows.map(m => ({
        id: m.id,
        fullName: m.full_name,
        email: m.email,
        role: m.role,
        joinedAt: m.joined_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const now = new Date().toISOString();
    const updateRes = await db.execute({
      sql: 'UPDATE groups SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      args: [name.trim(), (description || '').trim(), now, id],
    });

    if (updateRes.rowsAffected === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    res.json({ success: true, message: 'Group updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Check if group exists
    const groupCheck = await db.execute({
      sql: 'SELECT id, name FROM groups WHERE id = ?',
      args: [id],
    });
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Delete group (cascade handles group_memberships)
    await db.execute({
      sql: 'DELETE FROM groups WHERE id = ?',
      args: [id],
    });

    res.json({ success: true, message: 'Group deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manage members inside a group
apiRouter.post('/groups/:id/members', async (req: Request, res: Response) => {
  try {
    const { id: groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required.' });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: 'INSERT OR IGNORE INTO group_memberships (group_id, member_id, joined_at) VALUES (?, ?, ?)',
      args: [groupId, memberId, now],
    });

    res.status(201).json({ success: true, message: 'Member added to group.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/groups/:id/members/:memberId', async (req: Request, res: Response) => {
  try {
    const { id: groupId, memberId } = req.params;
    await db.execute({
      sql: 'DELETE FROM group_memberships WHERE group_id = ? AND member_id = ?',
      args: [groupId, memberId],
    });
    res.json({ success: true, message: 'Member removed from group.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Members CRUD
// ==========================================
apiRouter.get('/members', async (req: Request, res: Response) => {
  try {
    const { search, groupId } = req.query;

    let query = `
      SELECT 
        m.id, m.full_name, m.email, m.role, m.created_at, m.updated_at,
        GROUP_CONCAT(g.id || ':' || g.name) as groups_list
      FROM members m
      LEFT JOIN group_memberships gm ON m.id = gm.member_id
      LEFT JOIN groups g ON gm.group_id = g.id
    `;
    const whereConditions: string[] = [];
    const args: any[] = [];

    if (groupId && typeof groupId === 'string' && groupId !== 'all') {
      whereConditions.push('m.id IN (SELECT member_id FROM group_memberships WHERE group_id = ?)');
      args.push(groupId);
    }

    if (search && typeof search === 'string' && search.trim()) {
      whereConditions.push('(m.full_name LIKE ? OR m.email LIKE ?)');
      const pattern = `%${search.trim()}%`;
      args.push(pattern, pattern);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` GROUP BY m.id ORDER BY m.full_name ASC`;

    const result = await db.execute({ sql: query, args });

    const members = result.rows.map(r => {
      const groupsStr = r.groups_list ? String(r.groups_list) : '';
      const groups = groupsStr
        ? groupsStr.split(',').map(entry => {
            const [id, ...nameParts] = entry.split(':');
            return { id, name: nameParts.join(':') };
          })
        : [];

      return {
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        role: r.role || 'Member',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        groups,
      };
    });

    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/members', async (req: Request, res: Response) => {
  try {
    const { fullName, email, role, groupIds } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    // Duplicate email check
    const existing = await db.execute({
      sql: 'SELECT id FROM members WHERE LOWER(email) = LOWER(?)',
      args: [email.trim()],
    });
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A member with this email address already exists.' });
    }

    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO members (id, full_name, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, fullName.trim(), email.trim().toLowerCase(), (role || 'Member').trim(), now, now],
    });

    // Add to selected groups
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const gid of groupIds) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO group_memberships (group_id, member_id, joined_at) VALUES (?, ?, ?)',
          args: [gid, id, now],
        });
      }
    }

    res.status(201).json({
      id,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: (role || 'Member').trim(),
      createdAt: now,
      updatedAt: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/members/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, groupIds } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    // Check duplicate email for another member
    const existing = await db.execute({
      sql: 'SELECT id FROM members WHERE LOWER(email) = LOWER(?) AND id != ?',
      args: [email.trim(), id],
    });
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This email is already in use by another community member.' });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE members SET full_name = ?, email = ?, role = ?, updated_at = ? WHERE id = ?',
      args: [fullName.trim(), email.trim().toLowerCase(), (role || 'Member').trim(), now, id],
    });

    // Update group memberships
    if (Array.isArray(groupIds)) {
      await db.execute({
        sql: 'DELETE FROM group_memberships WHERE member_id = ?',
        args: [id],
      });
      for (const gid of groupIds) {
        await db.execute({
          sql: 'INSERT INTO group_memberships (group_id, member_id, joined_at) VALUES (?, ?, ?)',
          args: [gid, id, now],
        });
      }
    }

    res.json({ success: true, message: 'Member updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute({
      sql: 'DELETE FROM members WHERE id = ?',
      args: [id],
    });
    res.json({ success: true, message: 'Member deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Announcements CRUD & Sending
// ==========================================
apiRouter.get('/announcements', async (req: Request, res: Response) => {
  try {
    const { status, groupId, search } = req.query;

    let query = `
      SELECT 
        a.id, a.title, a.group_id, a.subject, a.content,
        a.recipient_count, a.success_count, a.failure_count, a.status,
        a.created_at, a.sent_at,
        g.name as group_name
      FROM announcements a
      LEFT JOIN groups g ON a.group_id = g.id
    `;
    const whereConditions: string[] = [];
    const args: any[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      whereConditions.push('a.status = ?');
      args.push(status);
    }
    if (groupId && typeof groupId === 'string' && groupId !== 'all') {
      whereConditions.push('a.group_id = ?');
      args.push(groupId);
    }
    if (search && typeof search === 'string' && search.trim()) {
      whereConditions.push('(a.title LIKE ? OR a.subject LIKE ? OR a.content LIKE ?)');
      const pattern = `%${search.trim()}%`;
      args.push(pattern, pattern, pattern);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await db.execute({ sql: query, args });
    const announcements = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      groupId: r.group_id,
      groupName: r.group_name || 'All Members',
      subject: r.subject,
      content: r.content,
      recipientCount: Number(r.recipient_count || 0),
      successCount: Number(r.success_count || 0),
      failureCount: Number(r.failure_count || 0),
      status: r.status,
      createdAt: r.created_at,
      sentAt: r.sent_at,
    }));

    res.json(announcements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/announcements/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const annRes = await db.execute({
      sql: `
        SELECT 
          a.id, a.title, a.group_id, a.subject, a.content,
          a.recipient_count, a.success_count, a.failure_count, a.status,
          a.created_at, a.sent_at,
          g.name as group_name
        FROM announcements a
        LEFT JOIN groups g ON a.group_id = g.id
        WHERE a.id = ?
      `,
      args: [id],
    });

    if (annRes.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    const recipientsRes = await db.execute({
      sql: `
        SELECT id, member_id, email, name, status, provider_message_id, preview_url, error_message, sent_at
        FROM announcement_recipients
        WHERE announcement_id = ?
        ORDER BY status ASC, name ASC
      `,
      args: [id],
    });

    const row = annRes.rows[0];
    res.json({
      id: row.id,
      title: row.title,
      groupId: row.group_id,
      groupName: row.group_name || 'All Members',
      subject: row.subject,
      content: row.content,
      recipientCount: Number(row.recipient_count || 0),
      successCount: Number(row.success_count || 0),
      failureCount: Number(row.failure_count || 0),
      status: row.status,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      recipients: recipientsRes.rows.map(r => ({
        id: r.id,
        memberId: r.member_id,
        email: r.email,
        name: r.name,
        status: r.status,
        providerMessageId: r.provider_message_id,
        previewUrl: r.preview_url,
        errorMessage: r.error_message,
        sentAt: r.sent_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create draft announcement
apiRouter.post('/announcements', async (req: Request, res: Response) => {
  try {
    const { title, groupId, subject, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Announcement title is required.' });
    }
    if (!groupId) {
      return res.status(400).json({ error: 'Recipient group is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Email subject is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Announcement content is required.' });
    }

    const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO announcements 
        (id, title, group_id, subject, content, recipient_count, success_count, failure_count, status, created_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'draft', ?)`,
      args: [id, title.trim(), groupId, subject.trim(), content.trim(), now],
    });

    res.status(201).json({ id, title, groupId, subject, content, status: 'draft', createdAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Primary Send endpoint
apiRouter.post('/announcements/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch announcement
    const annRes = await db.execute({
      sql: 'SELECT * FROM announcements WHERE id = ?',
      args: [id],
    });
    if (annRes.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    const announcement = annRes.rows[0];

    // Fetch target group
    const groupRes = await db.execute({
      sql: 'SELECT name FROM groups WHERE id = ?',
      args: [announcement.group_id],
    });
    const groupName = String(groupRes.rows[0]?.name || 'Community Group');

    // Fetch members in this group
    const membersRes = await db.execute({
      sql: `
        SELECT m.id, m.full_name, m.email
        FROM members m
        JOIN group_memberships gm ON m.id = gm.member_id
        WHERE gm.group_id = ?
      `,
      args: [announcement.group_id],
    });

    if (membersRes.rows.length === 0) {
      return res.status(400).json({
        error: 'Cannot dispatch announcement: The target group contains 0 members.',
      });
    }

    const recipients = membersRes.rows.map(m => ({
      id: String(m.id),
      name: String(m.full_name),
      email: String(m.email),
    }));

    // Update status to 'sending'
    await db.execute({
      sql: "UPDATE announcements SET status = 'sending' WHERE id = ?",
      args: [id],
    });

    // Execute delivery batch
    const deliveryResult = await sendAnnouncementBatch({
      announcementId: String(id),
      groupName,
      subject: String(announcement.subject),
      content: String(announcement.content),
      recipients,
      isRetry: false,
    });

    res.json({
      success: true,
      message: `Announcement delivery processed: ${deliveryResult.successful} delivered, ${deliveryResult.failed} failed.`,
      result: deliveryResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retry failed recipients for an announcement
apiRouter.post('/announcements/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const annRes = await db.execute({
      sql: 'SELECT * FROM announcements WHERE id = ?',
      args: [id],
    });
    if (annRes.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    const announcement = annRes.rows[0];

    const groupRes = await db.execute({
      sql: 'SELECT name FROM groups WHERE id = ?',
      args: [announcement.group_id],
    });
    const groupName = String(groupRes.rows[0]?.name || 'Community Group');

    // Fetch ONLY failed recipients
    const failedRecipientsRes = await db.execute({
      sql: "SELECT member_id, email, name FROM announcement_recipients WHERE announcement_id = ? AND status = 'failed'",
      args: [id],
    });

    if (failedRecipientsRes.rows.length === 0) {
      return res.status(400).json({
        error: 'There are no failed recipients to retry for this announcement.',
      });
    }

    const recipients = failedRecipientsRes.rows.map(r => ({
      id: String(r.member_id || r.email),
      name: String(r.name),
      email: String(r.email),
    }));

    const deliveryResult = await sendAnnouncementBatch({
      announcementId: String(id),
      groupName,
      subject: String(announcement.subject),
      content: String(announcement.content),
      recipients,
      isRetry: true,
    });

    res.json({
      success: true,
      message: `Retry processed: ${deliveryResult.successful} succeeded, ${deliveryResult.failed} failed.`,
      result: deliveryResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export for Announcement History
apiRouter.get('/announcements/export/csv', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        a.id, a.title, g.name as group_name, a.subject,
        a.recipient_count, a.success_count, a.failure_count, a.status,
        a.created_at, a.sent_at
      FROM announcements a
      LEFT JOIN groups g ON a.group_id = g.id
      ORDER BY a.created_at DESC
    `);

    let csv = 'ID,Title,Target Group,Subject,Intended Recipients,Delivered,Failed,Status,Created At,Sent At\n';
    for (const r of result.rows) {
      const escape = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;
      csv += [
        escape(r.id),
        escape(r.title),
        escape(r.group_name || 'N/A'),
        escape(r.subject),
        r.recipient_count || 0,
        r.success_count || 0,
        r.failure_count || 0,
        escape(r.status),
        escape(r.created_at),
        escape(r.sent_at || ''),
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mailflow-announcements-history.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Settings & Diagnostics
// ==========================================
apiRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute('SELECT key, value FROM application_settings');
    const settings: Record<string, string> = {};
    for (const r of rows.rows) {
      settings[String(r.key)] = String(r.value);
    }
    const emailProvider = await getEmailProviderStatus();

    res.json({
      appName: settings['app_name'] || 'MailFlow Community',
      senderName: settings['sender_name'] || 'MailFlow Announcements',
      senderEmail: settings['sender_email'] || 'announcements@mailflow.app',
      emailProvider,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/settings', async (req: Request, res: Response) => {
  try {
    const { appName, senderName, senderEmail } = req.body;
    const now = new Date().toISOString();

    if (appName) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)',
        args: ['app_name', appName.trim(), now],
      });
    }
    if (senderName) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)',
        args: ['sender_name', senderName.trim(), now],
      });
    }
    if (senderEmail) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)',
        args: ['sender_email', senderEmail.trim(), now],
      });
    }

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings/test-email', async (req: Request, res: Response) => {
  try {
    const { targetEmail } = req.body;
    if (!targetEmail || !targetEmail.trim()) {
      return res.status(400).json({ error: 'Target email is required.' });
    }

    const result = await sendTestEmail(targetEmail.trim());
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email successfully dispatched!',
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Gemini AI Writing Assistance
// ==========================================
apiRouter.post('/gemini/assist', async (req: Request, res: Response) => {
  try {
    const { type, content, topic, groupName, action } = req.body;

    if (type === 'suggest_subjects') {
      const suggestions = await generateSubjectSuggestions({
        topic,
        content: content || '',
        groupName: groupName || 'Community',
      });
      return res.json({ suggestions });
    }

    if (type === 'polish_content') {
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required to polish.' });
      }

      const polished = await polishAnnouncementContent({
        content,
        action: action || 'improve_clarity',
        groupName: groupName || 'Community',
      });
      return res.json({ polished });
    }

    res.status(400).json({ error: 'Invalid assist type requested.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Seed Sample Data
// ==========================================
apiRouter.post('/seed', async (_req: Request, res: Response) => {
  try {
    await seedSampleData();
    res.json({ success: true, message: 'Sample community data seeded successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
