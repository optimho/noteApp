# Technical Specification – Basic Note Taking Web App

## 1. Overview

A web application where authenticated users can create, view, edit, and delete plain-text notes.

### Core Features

- User authentication (sign up, login, logout)
- Authenticated note management (create, list, view, edit, delete)
- Notes have a title and plain-text body
- Dashboard lists all notes for the logged-in user

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Runtime | Bun |
| Language | TypeScript |
| Styling | TailwindCSS |
| Database | SQLite via `bun:sqlite` (raw SQL) |
| Auth | better-auth |

---

## 2. Architecture

- **Frontend & Backend:** Next.js App Router — server components for data fetching, client components for forms
- **Database:** Single SQLite file at `data/app.db`
- **Auth:** better-auth with email/password, session cookies

---

## 3. Functional Requirements

### 3.1 Authentication

- Users can register with name, email, and password
- Users can log in and log out
- Unauthenticated users are redirected to `/login`

### 3.2 Notes

| Action | Behaviour |
|--------|-----------|
| Create | New note with default title "Untitled note" and empty body |
| List | Dashboard shows all notes: title + last updated |
| Edit | Edit title and body; auto-save or explicit save button |
| Delete | Hard delete with confirmation |

---

## 4. Data Model

### Auth Tables

Managed by better-auth: `user`, `session`, `account`, `verification`.

### `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled note',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
```

---

## 5. API Endpoints

All routes require authentication and return 401 if not authenticated.

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/api/notes` | List user's notes | 200 `[{id, title, updatedAt}]` |
| POST | `/api/notes` | Create note | 201 `{id, title, body}` |
| GET | `/api/notes/:id` | Get single note | 200 `{id, title, body}` |
| PUT | `/api/notes/:id` | Update title/body | 200 note |
| DELETE | `/api/notes/:id` | Delete note | 204 |

---

## 6. Pages & Routes

```
app/
  page.tsx                  # Landing page with login/signup links
  (auth)/
    login/page.tsx
    register/page.tsx
  dashboard/page.tsx        # Note list + create button
  notes/[id]/page.tsx       # Note editor
  api/
    auth/[...all]/route.ts
    notes/route.ts
    notes/[id]/route.ts

components/
  NoteList.tsx              # List of note links
  NoteEditor.tsx            # Title + body textarea
  DeleteNoteButton.tsx      # Confirm-then-delete
```

---

## 7. Security

- All note queries filter by `user_id` — users cannot access each other's notes
- Sessions enforced server-side on every protected page and API route

---

## 8. Scripts & Commands

```bash
bun install           # Install dependencies
bun run init-db       # Create data/app.db and run schema
bun run dev           # Dev server on :3000
bun run build         # Production build
bun run start         # Production server
```

---

## 9. Production Deployment (Raspberry Pi + Tailscale)

### Requirements

- Raspberry Pi (ARM64) with Raspberry Pi OS 64-bit
- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Node.js installed via nvm (required for `next build`)
- Caddy for reverse proxy
- Tailscale for remote access

### `.env.local` on the server

```bash
BETTER_AUTH_SECRET=<random 32+ char string>
BETTER_AUTH_URL=http://<tailscale-ip>
BETTER_AUTH_TRUSTED_ORIGINS=http://<tailscale-ip>,http://<local-ip>
NEXT_PUBLIC_BETTER_AUTH_URL=http://<tailscale-ip>
```

### systemd service (`/etc/systemd/system/noteapp.service`)

```ini
[Unit]
Description=NoteApp
After=network.target

[Service]
WorkingDirectory=/home/<user>/noteapp
ExecStart=/home/<user>/.bun/bin/bun --bun run next start -p 3000
Restart=always
User=<user>
EnvironmentFile=/home/<user>/noteapp/.env.local

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable noteapp
sudo systemctl start noteapp
```

### Caddy (`/etc/caddy/Caddyfile`)

```
:80 {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

### ⚠️ Gotchas

- **`bun run build` fails with `env: 'node': Permission denied`** — Next.js build requires Node.js. Install via nvm, then use `bun --bun run build`.
- **Login fails via Tailscale/remote IP** — better-auth rejects requests from untrusted origins. Add all access URLs to `BETTER_AUTH_TRUSTED_ORIGINS` in `.env.local`.
- **`useSecureCookies`** — Do not set this to `true` unless serving over HTTPS. Tie it to whether `BETTER_AUTH_URL` starts with `https://`.
- **Static IP** — Reserve the Pi's IP in your router/UniFi controller so it doesn't change on reboot.