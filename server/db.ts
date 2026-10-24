import { createClient, type Client } from '@libsql/client';

const dbPath = process.env.DATABASE_URL || 'file:mailflow.db';
export const db: Client = createClient({
  url: dbPath,
});

export async function initDatabase(): Promise<void> {
  // Enable foreign keys
  await db.execute('PRAGMA foreign_keys = ON;');

  // Groups Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Members Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'Member',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Group Memberships Junction Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS group_memberships (
      group_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (group_id, member_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);

  // Announcements Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      group_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      recipient_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      sent_at TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
    );
  `);

  // Announcement Recipients Detail Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS announcement_recipients (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      member_id TEXT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      provider_message_id TEXT,
      preview_url TEXT,
      error_message TEXT,
      sent_at TEXT,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
    );
  `);

  // Delivery Attempts Table (Audit Trail)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_attempts (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      attempt_type TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      successful INTEGER NOT NULL,
      failed INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
    );
  `);

  // Application Settings Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS application_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Initialize default settings if absent
  const settingsCheck = await db.execute('SELECT COUNT(*) as count FROM application_settings');
  const count = Number(settingsCheck.rows[0]?.count || 0);
  if (count === 0) {
    const now = new Date().toISOString();
    await db.execute({
      sql: 'INSERT INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)',
      args: ['app_name', 'MailFlow Community', now]
    });
    await db.execute({
      sql: 'INSERT INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)',
      args: ['sender_name', 'MailFlow Announcements', now]
    });
    await db.execute({
      sql: 'INSERT INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)',
      args: ['sender_email', 'announcements@mailflow.app', now]
    });
    await db.execute({
      sql: 'INSERT INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)',
      args: ['provider_type', 'ethereal', now]
    });
  }

  // Check if initial sample data should be seeded
  const groupsCheck = await db.execute('SELECT COUNT(*) as count FROM groups');
  if (Number(groupsCheck.rows[0]?.count || 0) === 0) {
    await seedSampleData();
  }
}

export async function seedSampleData(): Promise<void> {
  const now = new Date().toISOString();
  
  // Create sample groups
  const sampleGroups = [
    {
      id: 'grp_core_team',
      name: 'Core Contributors',
      description: 'Lead developers, product designers, and project maintainers.',
    },
    {
      id: 'grp_community',
      name: 'All Community Members',
      description: 'The general community directory for global updates and town hall invites.',
    },
    {
      id: 'grp_beta_testers',
      name: 'Beta Testers Guild',
      description: 'Active users testing early-access features, UI refinements, and updates.',
    },
    {
      id: 'grp_mentors',
      name: 'Mentors & Organizers',
      description: 'Community organizers and workshop leaders helping newcomers.',
    }
  ];

  for (const g of sampleGroups) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO groups (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      args: [g.id, g.name, g.description, now, now]
    });
  }

  // Create sample members
  const sampleMembers = [
    { id: 'mem_1', name: 'Sophia Chen', email: 'sophia.chen@example.com', role: 'Lead Architect', groups: ['grp_core_team', 'grp_community'] },
    { id: 'mem_2', name: 'Marcus Vance', email: 'marcus.v@example.com', role: 'Staff Engineer', groups: ['grp_core_team', 'grp_community'] },
    { id: 'mem_3', name: 'Elena Rostova', email: 'elena.rostova@example.com', role: 'Design Lead', groups: ['grp_core_team', 'grp_community', 'grp_beta_testers'] },
    { id: 'mem_4', name: 'Amara Okafor', email: 'amara.okafor@example.com', role: 'Community Organizer', groups: ['grp_community', 'grp_mentors'] },
    { id: 'mem_5', name: 'Liam Davies', email: 'liam.davies@example.com', role: 'Developer Advocate', groups: ['grp_community', 'grp_mentors', 'grp_beta_testers'] },
    { id: 'mem_6', name: 'Zoya Patel', email: 'zoya.p@example.com', role: 'Frontend Specialist', groups: ['grp_community', 'grp_beta_testers'] },
    { id: 'mem_7', name: 'Kenji Takahashi', email: 'kenji.t@example.com', role: 'Active Member', groups: ['grp_community'] },
    { id: 'mem_8', name: 'Hannah Wright', email: 'hannah.w@example.com', role: 'Product Researcher', groups: ['grp_community', 'grp_beta_testers'] },
  ];

  for (const m of sampleMembers) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO members (id, full_name, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [m.id, m.name, m.email, m.role, now, now]
    });

    for (const gid of m.groups) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO group_memberships (group_id, member_id, joined_at) VALUES (?, ?, ?)',
        args: [gid, m.id, now]
      });
    }
  }

  // Create an initial sample announcement in history to show live demo state
  const announcementId = 'ann_sample_welcome';
  const pastDate = new Date(Date.now() - 3600000 * 24).toISOString();
  await db.execute({
    sql: `INSERT OR REPLACE INTO announcements 
      (id, title, group_id, subject, content, recipient_count, success_count, failure_count, status, created_at, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      announcementId,
      'Welcome to MailFlow Community',
      'grp_community',
      'Welcome to the MailFlow Community Hub!',
      'Hello {{first_name}},\n\nWe are thrilled to welcome you to our official community announcement channel. Here, you will receive timely release notes, workshop schedules, and updates directly to your inbox.\n\nPlease feel free to reach out to our team if you have any questions.\n\nWarm regards,\nThe MailFlow Team',
      sampleMembers.length,
      sampleMembers.length,
      0,
      'sent',
      pastDate,
      pastDate
    ]
  });

  for (const m of sampleMembers) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO announcement_recipients 
        (id, announcement_id, member_id, email, name, status, provider_message_id, preview_url, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `rec_${announcementId}_${m.id}`,
        announcementId,
        m.id,
        m.email,
        m.name,
        'delivered',
        `msg_${Math.random().toString(36).substring(2, 10)}`,
        null,
        pastDate
      ]
    });
  }
}
