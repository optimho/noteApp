import { query, get, run } from "./db";
import { nanoid } from "nanoid";
import { rmSync } from "node:fs";
import path from "node:path";

export type Note = {
  id: string;
  userId: string;
  title: string;
  contentJson: string;
  isPublic: boolean;
  isCollaborative: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  is_collaborative: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentJson: row.content_json,
    isPublic: row.is_public === 1,
    isCollaborative: row.is_collaborative === 1,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EMPTY_DOC = JSON.stringify({ type: "doc", content: [] });

export async function createNote(
  userId: string,
  data: { title?: string; contentJson?: string } = {}
): Promise<Note> {
  const id = nanoid();
  const title = data.title ?? "Untitled note";
  const contentJson = data.contentJson ?? EMPTY_DOC;
  const now = new Date().toISOString();

  await run(
    `INSERT INTO notes (id, user_id, title, content_json, is_public, public_slug, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`,
    [id, userId, title, contentJson, now, now]
  );

  const row = await get<NoteRow>("SELECT * FROM notes WHERE id = ?", [id]);
  return toNote(row!);
}

export async function getNoteById(
  userId: string,
  noteId: string
): Promise<Note | null> {
  const row = await get<NoteRow>(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [noteId, userId]
  );
  return row ? toNote(row) : null;
}

export async function getNotesByUser(userId: string): Promise<Note[]> {
  const rows = await query<NoteRow>(
    "SELECT id, user_id, title, is_public, is_collaborative, public_slug, created_at, updated_at, '' as content_json FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return rows.map(toNote);
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: Partial<{ title: string; contentJson: string }>
): Promise<Note | null> {
  const existing = await getNoteById(userId, noteId);
  if (!existing) return null;

  const title = data.title ?? existing.title;
  const contentJson = data.contentJson ?? existing.contentJson;
  const now = new Date().toISOString();

  await run(
    "UPDATE notes SET title = ?, content_json = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [title, contentJson, now, noteId, userId]
  );

  const row = await get<NoteRow>("SELECT * FROM notes WHERE id = ?", [noteId]);
  return toNote(row!);
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  await run("DELETE FROM notes WHERE id = ? AND user_id = ?", [noteId, userId]);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "notes", noteId);
  try { rmSync(uploadDir, { recursive: true, force: true }); } catch { /* ok if missing */ }
}

export async function setNotePublic(
  userId: string,
  noteId: string,
  isPublic: boolean
): Promise<Note | null> {
  const existing = await getNoteById(userId, noteId);
  if (!existing) return null;

  const now = new Date().toISOString();

  if (isPublic) {
    const slug = existing.publicSlug ?? nanoid(16);
    await run(
      "UPDATE notes SET is_public = 1, public_slug = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      [slug, now, noteId, userId]
    );
  } else {
    await run(
      "UPDATE notes SET is_public = 0, public_slug = NULL, updated_at = ? WHERE id = ? AND user_id = ?",
      [now, noteId, userId]
    );
  }

  const row = await get<NoteRow>("SELECT * FROM notes WHERE id = ?", [noteId]);
  return toNote(row!);
}

export async function getNoteByPublicSlug(slug: string): Promise<Note | null> {
  const row = await get<NoteRow>(
    "SELECT * FROM notes WHERE public_slug = ? AND is_public = 1",
    [slug]
  );
  return row ? toNote(row) : null;
}

export async function getAllPublicNotes(): Promise<Note[]> {
  const rows = await query<NoteRow>(
    "SELECT id, user_id, title, is_public, is_collaborative, public_slug, created_at, updated_at, '' as content_json FROM notes WHERE is_public = 1 ORDER BY updated_at DESC",
    []
  );
  return rows.map(toNote);
}

export async function getNoteBySlugForEdit(slug: string, userId: string): Promise<Note | null> {
  const row = await get<NoteRow>(
    "SELECT * FROM notes WHERE public_slug = ? AND is_public = 1 AND (is_collaborative = 1 OR user_id = ?)",
    [slug, userId]
  );
  return row ? toNote(row) : null;
}

export async function updateCollaborativeNote(
  noteId: string,
  userId: string,
  data: Partial<{ title: string; contentJson: string }>
): Promise<Note | null> {
  // Check if note is collaborative or owned by user
  const existing = await get<NoteRow>(
    "SELECT * FROM notes WHERE id = ? AND (is_collaborative = 1 OR user_id = ?)",
    [noteId, userId]
  );

  if (!existing) return null;

  const title = data.title ?? existing.title;
  const contentJson = data.contentJson ?? existing.content_json;
  const now = new Date().toISOString();

  await run(
    "UPDATE notes SET title = ?, content_json = ?, updated_at = ? WHERE id = ?",
    [title, contentJson, now, noteId]
  );

  const row = await get<NoteRow>("SELECT * FROM notes WHERE id = ?", [noteId]);
  return toNote(row!);
}

export type NoteScan = {
  id: string;
  noteId: string;
  rawValue: string;
  format: string;
  createdAt: string;
};

type NoteScanRow = {
  id: string;
  note_id: string;
  raw_value: string;
  format: string;
  created_at: string;
};

function toNoteScan(row: NoteScanRow): NoteScan {
  return { id: row.id, noteId: row.note_id, rawValue: row.raw_value, format: row.format, createdAt: row.created_at };
}

export async function addNoteScan(noteId: string, rawValue: string, format: string): Promise<NoteScan> {
  const id = nanoid();
  await run(
    "INSERT INTO note_scans (id, note_id, raw_value, format) VALUES (?, ?, ?, ?)",
    [id, noteId, rawValue, format]
  );
  const row = await get<NoteScanRow>("SELECT * FROM note_scans WHERE id = ?", [id]);
  return toNoteScan(row!);
}

export async function getScansByNoteId(noteId: string): Promise<NoteScan[]> {
  const rows = await query<NoteScanRow>(
    "SELECT * FROM note_scans WHERE note_id = ? ORDER BY created_at DESC",
    [noteId]
  );
  return rows.map(toNoteScan);
}

export async function deleteNoteScan(scanId: string, noteId: string): Promise<boolean> {
  const row = await get<NoteScanRow>(
    "SELECT id FROM note_scans WHERE id = ? AND note_id = ?",
    [scanId, noteId]
  );
  if (!row) return false;
  await run("DELETE FROM note_scans WHERE id = ?", [scanId]);
  return true;
}

export type NotePhoto = {
  id: string;
  noteId: string;
  filename: string;
  createdAt: string;
};

type NotePhotoRow = {
  id: string;
  note_id: string;
  filename: string;
  created_at: string;
};

function toNotePhoto(row: NotePhotoRow): NotePhoto {
  return { id: row.id, noteId: row.note_id, filename: row.filename, createdAt: row.created_at };
}

export async function addNotePhoto(noteId: string, filename: string): Promise<NotePhoto> {
  const id = nanoid();
  await run(
    "INSERT INTO note_photos (id, note_id, filename) VALUES (?, ?, ?)",
    [id, noteId, filename]
  );
  const row = await get<NotePhotoRow>("SELECT * FROM note_photos WHERE id = ?", [id]);
  return toNotePhoto(row!);
}

export async function getPhotosByNoteId(noteId: string): Promise<NotePhoto[]> {
  const rows = await query<NotePhotoRow>(
    "SELECT * FROM note_photos WHERE note_id = ? ORDER BY created_at ASC",
    [noteId]
  );
  return rows.map(toNotePhoto);
}

export async function deleteNotePhoto(photoId: string, noteId: string): Promise<string | null> {
  const row = await get<NotePhotoRow>(
    "SELECT * FROM note_photos WHERE id = ? AND note_id = ?",
    [photoId, noteId]
  );
  if (!row) return null;
  await run("DELETE FROM note_photos WHERE id = ?", [photoId]);
  return row.filename;
}

export async function setNoteCollaborative(
  userId: string,
  noteId: string,
  isCollaborative: boolean
): Promise<Note | null> {
  const existing = await getNoteById(userId, noteId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await run(
    "UPDATE notes SET is_collaborative = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [isCollaborative ? 1 : 0, now, noteId, userId]
  );

  const row = await get<NoteRow>("SELECT * FROM notes WHERE id = ?", [noteId]);
  return toNote(row!);
}
