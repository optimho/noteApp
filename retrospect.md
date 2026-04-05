# Stack Reference & Retrospective

This document captures the full tech stack, architecture decisions, lessons learned, and gotchas from building the NoteApp. Use it as a blueprint for future projects on the same stack.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 15 (App Router) | Server + client components, route handlers |
| Runtime | Bun | Replaces Node.js for dev, build, and prod |
| Language | TypeScript | Strict types throughout |
| Styling | TailwindCSS + `@tailwindcss/typography` | Utility-first; prose plugin for rich text |
| Database | SQLite via `bun:sqlite` | Raw SQL, no ORM |
| Auth | better-auth | Email/password, session cookies |
| Rich Text | TipTap + StarterKit | JSON document model |
| Deployment | Raspberry Pi + Tailscale Funnel | HTTPS via Tailscale, systemd service |

---

## 2. Project Structure

```
app/
  page.tsx                          # Landing page
  (auth)/
    login/page.tsx                  # Login form (client component)
    register/page.tsx               # Register form (client component)
  dashboard/page.tsx                # Note list (server component)
  notes/[id]/page.tsx               # Note editor page (server component)
  p/[slug]/page.tsx                 # Public note view
  api/
    auth/[...all]/route.ts          # better-auth handler
    notes/route.ts                  # GET list, POST create
    notes/[id]/route.ts             # GET, PUT, DELETE single note
    notes/[id]/share/route.ts       # POST toggle public sharing
    notes/[id]/collaborative/route.ts # POST toggle collaborative editing
    notes/[id]/photos/route.ts      # GET, POST photos
    notes/[id]/photos/[photoId]/route.ts # DELETE photo
    notes/[id]/scans/route.ts       # GET, POST barcode scans
    notes/[id]/scans/[scanId]/route.ts  # DELETE scan
    public-notes/[slug]/route.ts    # GET + PUT public note (no auth)
    uploads/[noteId]/[filename]/route.ts # Serve uploaded images

components/
  NoteEditor.tsx                    # TipTap editor (forwardRef, insertText handle)
  NoteEditorPage.tsx                # Full editor page wrapper (client)
  NoteList.tsx                      # Dashboard note list
  NotePhotoGallery.tsx              # Photo grid below editor
  NoteScanList.tsx                  # Scanned codes list below editor
  CameraCapture.tsx                 # Photo capture via file input
  BarcodeScanner.tsx                # QR/barcode scanner overlay
  ShareToggle.tsx                   # Public sharing toggle
  CollaborativeToggle.tsx           # Collaborative editing toggle
  DeleteNoteButton.tsx              # Confirm-then-delete
  PublicNoteViewer.tsx              # Read-only TipTap viewer
  PublicNoteEditor.tsx              # Editable TipTap for collaborative public notes
  Toolbar.tsx                       # TipTap formatting toolbar

lib/
  auth.ts                           # better-auth instance (lazy init)
  auth-client.ts                    # Client-side auth helpers
  db.ts                             # SQLite helpers: query, get, run
  notes.ts                          # Note + photo + scan repository functions
  hooks/
    useCameraAvailable.ts           # Detects camera via MediaDevices API
  barcode-detector.d.ts             # TypeScript ambient types for BarcodeDetector API

scripts/
  init-db.ts                        # Creates all tables (idempotent, IF NOT EXISTS)
```

---

## 3. Database Schema

### better-auth tables (auto-managed)
`user`, `session`, `account`, `verification`

### Application tables

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,       -- TipTap JSON as string
  is_public INTEGER NOT NULL DEFAULT 0,
  is_collaborative INTEGER NOT NULL DEFAULT 0,
  public_slug TEXT UNIQUE,          -- nanoid(16) when shared
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE note_photos (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,           -- e.g. "abc123.jpg"
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE note_scans (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  raw_value TEXT NOT NULL,          -- decoded text/URL/code
  format TEXT NOT NULL,             -- e.g. "qr_code", "ean_13"
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

**Key principles:**
- Always use `CREATE TABLE IF NOT EXISTS` in `init-db.ts` so it is safe to re-run
- Enable WAL mode and foreign keys on every DB connection: `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`
- Use `ON DELETE CASCADE` on foreign keys so child rows are cleaned up automatically
- IDs are `nanoid()` strings, not integers
- Timestamps stored as TEXT ISO strings via `datetime('now')`

---

## 4. Auth Configuration

```typescript
// lib/auth.ts — lazy initialization pattern required for Next.js + bun:sqlite
let _auth: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!_auth) {
    const { Database } = require("bun:sqlite");
    _auth = betterAuth({
      database: new Database("data/app.db", { create: true }),
      emailAndPassword: { enabled: true },
      trustedOrigins: [
        "http://localhost:3000",
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map(o => o.trim()) ?? []),
      ],
      baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      advanced: {
        useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith("https") ?? false,
      },
    });
  }
  return _auth;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    const instance = getAuth();
    const value = instance[prop as keyof typeof instance];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
```

**Why lazy init?** Next.js runs module-level code at build time. `bun:sqlite` is only available at runtime, so importing it at the top level causes build failures. The lazy pattern defers the import until the first actual request.

---

## 5. DB Helper Pattern

```typescript
// lib/db.ts
let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    const { Database } = await import("bun:sqlite");
    const db = new Database("data/app.db", { create: true });
    db.exec("PRAGMA journal_mode=WAL;");
    db.exec("PRAGMA foreign_keys=ON;");
    _db = db;
  }
  return _db;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]>
export async function get<T>(sql: string, params?: unknown[]): Promise<T | undefined>
export async function run(sql: string, params?: unknown[]): Promise<void>
```

Keep all SQL in repository files (`lib/notes.ts`), not in route handlers. Route handlers only call repository functions.

---

## 6. Route Handler Pattern

```typescript
export const dynamic = "force-dynamic"; // always at the top

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // ... do work
  return NextResponse.json(result);
}
```

**Always:**
- `export const dynamic = "force-dynamic"` on every route handler
- Check session before any DB work
- Filter all queries by `user_id` — never trust the client for ownership

---

## 7. File Uploads

Photos are stored on the filesystem at `public/uploads/notes/<noteId>/<filename>`.

**Critical gotcha:** Next.js in production does **not** dynamically serve files added to `public/` after the server starts. Serving them through an API route works reliably:

```typescript
// app/api/uploads/[noteId]/[filename]/route.ts
export async function GET(_req, { params }) {
  const { noteId, filename } = await params;
  const safeNoteId = path.basename(noteId);    // prevent path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "uploads", "notes", safeNoteId, safeFilename);
  const buffer = await readFile(filePath);
  return new Response(buffer, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
```

Use `Bun.write(filePath, arrayBuffer)` to write files. Use `mkdirSync(dir, { recursive: true })` before writing. Add `public/uploads/` to `.gitignore`.

**Image compression before upload (client-side):**
```typescript
const bitmap = await createImageBitmap(file);
const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
const canvas = document.createElement("canvas");
canvas.width = Math.round(bitmap.width * scale);
canvas.height = Math.round(bitmap.height * scale);
canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
canvas.toBlob(async (blob) => { /* upload */ }, "image/jpeg", 0.6);
```

---

## 8. QR / Barcode Scanning

Use the native `BarcodeDetector` API (built into Android Chrome, zero bundle cost) with `@zxing/browser` as a dynamic-import fallback:

```typescript
const useNative = typeof BarcodeDetector !== "undefined";

if (useNative) {
  const detector = new BarcodeDetector({ formats: ["qr_code", "ean_13", ...] });
  // poll with requestAnimationFrame
} else {
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  // fallback
}
```

**TypeScript:** `BarcodeDetector` needs an ambient declaration file (`lib/barcode-detector.d.ts`) as it's not yet in the standard TS lib.

**Camera on mobile:** Always use `playsInline muted autoPlay` on `<video>` elements. Use `facingMode: { ideal: "environment" }` for rear camera.

---

## 9. TipTap Editor

```typescript
// Expose imperative handle for programmatic content insertion
const NoteEditor = forwardRef<NoteEditorHandle, Props>(function NoteEditor({ initialContent, onChangeAction }, ref) {
  const editor = useEditor({ ... });

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      if (!editor) return;
      editor.chain().focus()
        .insertContentAt(editor.state.doc.content.size, {
          type: "paragraph",
          content: [{ type: "text", text }],
        })
        .run();
    },
  }));
});
```

Always store TipTap content as `JSON.stringify(editor.getJSON())` in the DB. Parse with `JSON.parse()` when loading. Never store as HTML.

---

## 10. Auto-save Pattern

```typescript
const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const pendingContentRef = useRef<unknown>(null);

// Cleanup on unmount
useEffect(() => {
  return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
}, []);

function handleContentChange(json: unknown) {
  pendingContentRef.current = json;
  setSaved(false);
  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    pendingContentRef.current = null;
    saveNote({ contentJson: json });
  }, 800);
}

// Flush before navigation
async function handleBackToDashboard() {
  if (debounceTimer.current) { clearTimeout(debounceTimer.current); debounceTimer.current = null; }
  if (pendingContentRef.current !== null) {
    await saveNote({ contentJson: pendingContentRef.current });
    pendingContentRef.current = null;
  }
  window.location.href = "/dashboard"; // hard nav to bust router cache
}
```

**Why `window.location.href` not `router.push`?** Next.js's client-side router caches page results. Navigating to the dashboard with `router.push` keeps the old note page in cache. A hard navigation clears it so the next visit to the note loads fresh from the DB.

Also set in `next.config.ts`:
```typescript
experimental: {
  staleTimes: { dynamic: 0 },
}
```

---

## 11. Rate Limiting (Middleware)

Simple in-memory rate limiting in `middleware.ts`. Purge expired entries on every call to prevent unbounded memory growth:

```typescript
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key); // purge expired
  }
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX;
}
```

---

## 12. Middleware Structure

```typescript
export const config = {
  matcher: ["/dashboard/:path*", "/notes/:path*", "/api/auth/:path*"],
};
```

The middleware checks session cookies for protected routes and applies rate limiting to auth endpoints. Static files and public routes are not intercepted.

---

## 13. Deployment (Raspberry Pi)

### Prerequisites
- Raspberry Pi OS 64-bit
- Bun: `curl -fsSL https://bun.sh/install | bash`
- Tailscale: `curl -fsSL https://tailscale.com/install.sh | sh`

### Tailscale Funnel (HTTPS to internet)
```bash
sudo tailscale up
sudo tailscale funnel --bg 3000
```
Gives a trusted HTTPS URL like `https://hostname.tail-xxxxx.ts.net`. No Caddy or Let's Encrypt needed.

### `.env.local` on server
```bash
BETTER_AUTH_SECRET=<openssl rand -hex 32>
BETTER_AUTH_URL=https://<tailscale-url>
NEXT_PUBLIC_BETTER_AUTH_URL=https://<tailscale-url>
BETTER_AUTH_TRUSTED_ORIGINS=https://<tailscale-url>,http://localhost:3000
```

### systemd service
```ini
[Unit]
Description=NoteApp
After=network.target

[Service]
WorkingDirectory=/home/shoppinglist/noteapp
ExecStart=/home/shoppinglist/.bun/bin/bun --bun run next start -p 3000
Restart=always
User=shoppinglist
EnvironmentFile=/home/shoppinglist/noteapp/.env.local

[Install]
WantedBy=multi-user.target
```

### Deploy workflow
```bash
# From dev machine
rsync -av --exclude='.next' --exclude='node_modules' --exclude='.git' \
  ./noteApp/ shoppinglist@noteserver:/home/shoppinglist/noteapp/

# On Pi
cd /home/shoppinglist/noteapp
/home/shoppinglist/.bun/bin/bun install
/home/shoppinglist/.bun/bin/bun run init-db   # safe to re-run; uses IF NOT EXISTS
/home/shoppinglist/.bun/bin/bun run build
sudo systemctl restart noteapp.service
```

### SSH commands
```bash
# bun not in PATH for non-interactive SSH — use full path
ssh user@noteserver "/home/user/.bun/bin/bun run build"

# Restart service
ssh user@noteserver "sudo systemctl restart noteapp.service"

# View live logs
sudo journalctl -u noteapp.service -f
```

---

## 14. Security Checklist

| Item | Status |
|------|--------|
| `BETTER_AUTH_SECRET` set to a real random value | Required before going public |
| All note queries filter by `user_id` | Done |
| Rate limiting on login/register (10 req / 15 min) | Done |
| Login form locked after rate limit hit | Done |
| Passwords hashed with bcrypt (cost ≥ 10) | Done |
| `useSecureCookies` tied to HTTPS | Done |
| Path traversal prevented on file serving | Done (path.basename sanitization) |
| File size limit on uploads (5MB) | Done |
| Public notes read-only unless collaborative | Done |

---

## 15. Known Gotchas & Lessons Learned

### bun:sqlite + Next.js
Never import `bun:sqlite` at the module level in files used by Next.js. Always use lazy/dynamic import or `require()` inside a function. Next.js executes module-level code at build time where `bun:sqlite` is unavailable.

### better-auth `BETTER_AUTH_URL`
This must match the origin the browser uses to access the app. If accessing via Tailscale, set it to the Tailscale URL. Mismatches cause "Invalid origin" login errors.

### Next.js static file serving in production
Files added to `public/` after `next build` and `next start` are NOT automatically served. Serve dynamically created files (uploads, etc.) through an API route handler instead.

### Next.js router cache
Even with `export const dynamic = "force-dynamic"`, Next.js caches page results client-side. To ensure fresh data after mutations:
- Use `window.location.href` instead of `router.push` for post-save navigation
- Set `experimental.staleTimes.dynamic = 0` in `next.config.ts`

### Camera on mobile
- `getUserMedia` requires HTTPS — Tailscale Funnel satisfies this
- Always add `playsInline muted autoPlay` to `<video>` elements
- Mobile browsers block programmatic `.click()` on file inputs from inside async callbacks — trigger file inputs directly from the user's click event

### Tailscale Funnel + better-auth cookies
Set `useSecureCookies: true` when serving over HTTPS (Tailscale). Without it, sessions may not persist on mobile browsers.

### Running init-db after schema changes
Any new table must be added to `scripts/init-db.ts` and `init-db` must be re-run on the Pi after deploying. Because it uses `IF NOT EXISTS`, existing data is safe.

### bcrypt cost on Pi
The Pi's CPU is slow. Keep bcrypt cost at 8–10. Above 10 causes login/register to take several seconds.

---

## 16. Recommended Patterns for Future Projects

### Start with this file structure
```
scripts/init-db.ts      # DB schema, run once
lib/auth.ts             # Lazy better-auth init
lib/db.ts               # query/get/run helpers
lib/[feature].ts        # Repository per domain entity
app/api/[feature]/      # Route handlers (thin — delegate to lib/)
components/             # Client + server components
middleware.ts           # Auth check + rate limiting
```

### Use the spec.md approach
Before building, write a `spec.md` describing:
- Core features
- Data model (exact SQL)
- API endpoints
- Page routes
- Component list

This prevents scope creep and gives Claude a clear reference during implementation.

### Add features incrementally
Each feature should be:
1. Schema change → `init-db.ts`
2. Repository functions → `lib/`
3. API route(s) → `app/api/`
4. UI component(s) → `components/`
5. Wire into page → existing page component

### Keep `.env.local` out of git
The `.gitignore` already excludes `.env.local`. Store a `.env.example` with placeholder values instead.

### Always rsync then rebuild
After any code change, the Pi needs:
1. `rsync` to get the new files
2. `bun install` if `package.json` changed
3. `bun run init-db` if schema changed
4. `bun run build` to compile
5. `sudo systemctl restart noteapp.service`
