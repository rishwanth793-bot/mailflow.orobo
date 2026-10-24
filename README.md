# MailFlow — Smart Community Mail Automation

MailFlow is a community announcement and email automation platform designed for modern community organizers, developer guilds, and teams. Built for the **Uproot Innovation** technical assessment, it features a minimalist SaaS design inspired by Linear, Notion, and Stripe, real SQLite relational storage, robust personalized email delivery, live rendering previews, per-recipient delivery tracking, and server-side Gemini AI writing assistance.

---

## 1. Key Features

- **Relational Community Directories**: Manage groups and members with full CRUD operations, search, filters, roles, and many-to-many group memberships.
- **Dedicated Announcement Composer**:
  - Internal title tracking and searchable group selector with live recipient count badges.
  - Email subject and body editor with formatting tools and personalization tags (`{{first_name}}`, `{{full_name}}`, `{{group_name}}`).
  - Pre-send validation preventing accidental double sends and disallowing sends to empty groups.
  - Desktop and mobile live email preview simulation.
- **Server-Side Gemini AI Integration**:
  - High-open-rate subject line suggestions.
  - Tone calibration (Warm Community, Professional, Action/Urgent Reminder).
  - Grammar and structure polish using `@google/genai` and `gemini-3.8-flash`.
- **Multi-Provider Email Engine**:
  - **Resend API**: High-deliverability production API.
  - **Custom SMTP**: Connect any standard TLS/SSL SMTP server (SendGrid, Mailgun, Amazon SES, Postmark, Gmail).
  - **Ethereal Sandbox Mode**: Out-of-the-box development mode that sends real test messages and provides live web preview URLs (`https://ethereal.email/...`) for inspection without requiring external credentials.
- **Announcement History & Per-Recipient Auditing**:
  - Detailed recipient delivery breakdown (status: `delivered`, `sent`, `failed`).
  - Safe **Retry Failed** mechanism that retries *only* failed recipients without duplicate sends.
  - Downloadable CSV history export.
- **Settings & Pipeline Diagnostics**:
  - Configure sender identity and default "From" address.
  - Test email dispatch tool to verify credentials immediately.
  - Demo reset tool to seed realistic sample data anytime.

---

## 2. Architecture & Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite | Modern SPA with custom component system, Lucide icons, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript (`tsx`) | Modular REST API with centralized error handling |
| **Database** | SQLite via `@libsql/client` | Relational tables, foreign keys, cascades, parameterized queries |
| **Email Delivery** | Nodemailer & Resend | Dual delivery strategy with HTML sanitization & individual recipient dispatch |
| **AI Integration** | Google Gemini (`@google/genai`) | Server-side `gemini-3.8-flash` for writing assistance |

### Relational Database Schema

```sql
-- Groups Table
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Members Table
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'Member',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Junction Table (Many-to-Many)
CREATE TABLE group_memberships (
  group_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (group_id, member_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Announcements Table
CREATE TABLE announcements (
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

-- Announcement Recipients Detail Table
CREATE TABLE announcement_recipients (
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

-- Delivery Attempts Audit Log
CREATE TABLE delivery_attempts (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  attempt_type TEXT NOT NULL, -- 'initial', 'retry'
  recipient_count INTEGER NOT NULL,
  successful INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

---

## 3. Installation & Local Development

### Prerequisites
- Node.js 18+ or Bun
- npm or bun package manager

### Steps to Run

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(By default, MailFlow operates immediately in Ethereal Sandbox mode without requiring any external email credentials).*

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will start on **http://localhost:3000** with Express API routes mounted and Vite dev middleware serving the React UI.

4. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 4. Email Provider Configuration Guide

### Option A: Ethereal Sandbox Mode (Default)
Leave `RESEND_API_KEY` and `SMTP_*` blank in `.env`.
MailFlow will automatically provision a safe test sandbox. When an announcement is sent:
- Real test messages are delivered to the sandbox.
- An inspectable preview link (`https://ethereal.email/message/...`) is generated for each recipient.
- You can click **"View Ethereal Email Preview"** in the UI to see the rendered email in a browser.

### Option B: Resend (Recommended for Production)
1. Sign up at [resend.com](https://resend.com) and create an API Key.
2. In your `.env`:
   ```env
   RESEND_API_KEY="re_123456789"
   ```
3. Update default sender email in **Settings** or `.env` to match your verified domain (e.g. `announcements@yourdomain.com`).

### Option C: Custom SMTP (SendGrid, Mailgun, AWS SES, Gmail)
In your `.env`:
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your_smtp_password"
```

---

## 5. Google Integrations Explanation

- **Google AI Studio (Gemini 3.8 Flash)**:
  - Used for optional writing assistance in the announcement composer.
  - Features: Generates 4 context-aware subject suggestions and refines copy for clarity, grammar, or specific tones.
  - Security: All Gemini API requests run strictly through the server-side proxy `/api/gemini/assist`. The API key is never exposed to client browsers.

---

## 6. Testing & Verification Checklist

- [x] **Group Management**:
  - Created, edited, and deleted groups.
  - Verified member counts update dynamically.
  - Deleted group with members after confirmation modal.
- [x] **Member Management**:
  - Added new members with name, email, role, and group assignments.
  - Tested duplicate email prevention (409 conflict validation).
  - Tested invalid email format rejection.
- [x] **Announcement Composer**:
  - Populated group selector; verified sending is disabled if 0 members.
  - Inserted personalization tags (`{{first_name}}`, `{{group_name}}`).
  - Switched to Live Email Preview tab (Desktop & Mobile modes).
  - Used Gemini AI writing assistance to polish content.
- [x] **Personalized Delivery**:
  - Dispatched announcement with pre-send confirmation modal.
  - Verified individual personalized recipient emails were dispatched.
  - Inspected recipient delivery status and web preview links.
- [x] **History & Retries**:
  - Filtered announcements by status and group.
  - Opened detail drawer to view individual recipient delivery status.
  - Tested safe **Retry Failed** workflow without sending duplicate emails.
  - Exported announcement history to CSV.
- [x] **Settings**:
  - Verified sender display name and default from-address updates.
  - Tested the live pipeline verification tool.

---

## 7. Deployment Guide

MailFlow is built as a self-contained full-stack Node.js / Express application:

1. **Docker / Cloud Run / Railway / Render**:
   - The build command is `npm run build`.
   - The start command is `node server.ts` or `tsx server.ts`.
   - Mount persistent storage for `mailflow.db` if using a stateful container, or specify `DATABASE_URL` pointing to your desired SQLite/Turso database.
2. **Environment Variables on Host**:
   - `PORT`: `3000`
   - `GEMINI_API_KEY`: Your Gemini API key for writing assistance.
   - `RESEND_API_KEY` or `SMTP_*`: Your production email provider credentials.
