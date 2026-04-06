import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  get: vi.fn(),
  run: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id"),
}));

vi.mock("node:fs", () => ({
  rmSync: vi.fn(),
}));

import { query, get, run } from "@/lib/db";
import { rmSync } from "node:fs";
import {
  createNote,
  getNoteById,
  getNotesByUser,
  updateNote,
  deleteNote,
  setNotePublic,
  getNoteByPublicSlug,
  updateCollaborativeNote,
  setNoteCollaborative,
  deleteNoteScan,
  deleteNotePhoto,
  addNoteScan,
  addNotePhoto,
  getScansByNoteId,
  getPhotosByNoteId,
} from "@/lib/notes";

const mockQuery = vi.mocked(query);
const mockGet = vi.mocked(get);
const mockRun = vi.mocked(run);
const mockRmSync = vi.mocked(rmSync);

function makeNoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-1",
    user_id: "user-1",
    title: "Test Note",
    content_json: '{"type":"doc","content":[]}',
    is_public: 0,
    is_collaborative: 0,
    public_slug: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeScanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "scan-1",
    note_id: "note-1",
    raw_value: "https://example.com",
    format: "qr_code",
    created_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePhotoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "photo-1",
    note_id: "note-1",
    filename: "abc123.jpg",
    created_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRun.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createNote
// ---------------------------------------------------------------------------
describe("createNote", () => {
  it("uses default title and empty doc when no data provided", async () => {
    const row = makeNoteRow({ id: "test-id" });
    mockGet.mockResolvedValueOnce(row);

    const note = await createNote("user-1");

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO notes"),
      expect.arrayContaining(["test-id", "user-1", "Untitled note"])
    );
    expect(note.title).toBe("Test Note");
    expect(note.userId).toBe("user-1");
  });

  it("uses provided title and content", async () => {
    const row = makeNoteRow({ id: "test-id", title: "My Note" });
    mockGet.mockResolvedValueOnce(row);

    await createNote("user-1", { title: "My Note", contentJson: '{"type":"doc"}' });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO notes"),
      expect.arrayContaining(["My Note", '{"type":"doc"}'])
    );
  });

  it("maps row fields to camelCase Note type", async () => {
    const row = makeNoteRow({ id: "test-id", is_public: 0, is_collaborative: 1, public_slug: "abc" });
    mockGet.mockResolvedValueOnce(row);

    const note = await createNote("user-1");

    expect(note.isPublic).toBe(false);
    expect(note.isCollaborative).toBe(true);
    expect(note.publicSlug).toBe("abc");
  });
});

// ---------------------------------------------------------------------------
// getNoteById
// ---------------------------------------------------------------------------
describe("getNoteById", () => {
  it("returns note when found for correct user", async () => {
    mockGet.mockResolvedValueOnce(makeNoteRow());

    const note = await getNoteById("user-1", "note-1");

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND user_id = ?"),
      ["note-1", "user-1"]
    );
    expect(note).not.toBeNull();
    expect(note!.id).toBe("note-1");
  });

  it("returns null when note not found or belongs to different user", async () => {
    mockGet.mockResolvedValueOnce(undefined);

    const note = await getNoteById("user-2", "note-1");

    expect(note).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getNotesByUser
// ---------------------------------------------------------------------------
describe("getNotesByUser", () => {
  it("returns mapped notes ordered by updated_at", async () => {
    mockQuery.mockResolvedValueOnce([
      makeNoteRow({ id: "note-1" }),
      makeNoteRow({ id: "note-2" }),
    ]);

    const notes = await getNotesByUser("user-1");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = ?"),
      ["user-1"]
    );
    expect(notes).toHaveLength(2);
    expect(notes[0].id).toBe("note-1");
  });
});

// ---------------------------------------------------------------------------
// updateNote
// ---------------------------------------------------------------------------
describe("updateNote", () => {
  it("returns null when note does not exist", async () => {
    mockGet.mockResolvedValueOnce(undefined); // getNoteById returns nothing

    const result = await updateNote("user-1", "note-1", { title: "New" });

    expect(result).toBeNull();
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("updates title while preserving existing content", async () => {
    const existing = makeNoteRow();
    const updated = makeNoteRow({ title: "New Title" });
    mockGet
      .mockResolvedValueOnce(existing) // getNoteById
      .mockResolvedValueOnce(updated); // fetch after update

    const result = await updateNote("user-1", "note-1", { title: "New Title" });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE notes SET title"),
      expect.arrayContaining(["New Title", existing.content_json])
    );
    expect(result!.title).toBe("New Title");
  });

  it("updates content while preserving existing title", async () => {
    const existing = makeNoteRow();
    const newContent = '{"type":"doc","content":[{"type":"paragraph"}]}';
    const updated = makeNoteRow({ content_json: newContent });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    await updateNote("user-1", "note-1", { contentJson: newContent });

    expect(mockRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([existing.title, newContent])
    );
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------
describe("deleteNote", () => {
  it("deletes the note from the database", async () => {
    await deleteNote("user-1", "note-1");

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM notes"),
      ["note-1", "user-1"]
    );
  });

  it("removes the uploads directory", async () => {
    await deleteNote("user-1", "note-1");

    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining("note-1"),
      { recursive: true, force: true }
    );
  });
});

// ---------------------------------------------------------------------------
// setNotePublic
// ---------------------------------------------------------------------------
describe("setNotePublic", () => {
  it("returns null when note does not exist", async () => {
    mockGet.mockResolvedValueOnce(undefined);

    const result = await setNotePublic("user-1", "note-1", true);

    expect(result).toBeNull();
  });

  it("generates a new slug when making public with no existing slug", async () => {
    const existing = makeNoteRow({ public_slug: null });
    const updated = makeNoteRow({ is_public: 1, public_slug: "test-id" });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    const result = await setNotePublic("user-1", "note-1", true);

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("is_public = 1"),
      expect.arrayContaining(["test-id"]) // nanoid() returns "test-id"
    );
    expect(result!.isPublic).toBe(true);
  });

  it("reuses existing slug when already has one", async () => {
    const existing = makeNoteRow({ public_slug: "existing-slug" });
    const updated = makeNoteRow({ is_public: 1, public_slug: "existing-slug" });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    await setNotePublic("user-1", "note-1", true);

    expect(mockRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining(["existing-slug"])
    );
  });

  it("clears slug and sets is_public=0 when making private", async () => {
    const existing = makeNoteRow({ is_public: 1, public_slug: "some-slug" });
    const updated = makeNoteRow({ is_public: 0, public_slug: null });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    const result = await setNotePublic("user-1", "note-1", false);

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("is_public = 0, public_slug = NULL"),
      expect.anything()
    );
    expect(result!.isPublic).toBe(false);
    expect(result!.publicSlug).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getNoteByPublicSlug
// ---------------------------------------------------------------------------
describe("getNoteByPublicSlug", () => {
  it("returns note when found and public", async () => {
    mockGet.mockResolvedValueOnce(makeNoteRow({ is_public: 1, public_slug: "abc" }));

    const note = await getNoteByPublicSlug("abc");

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining("public_slug = ? AND is_public = 1"),
      ["abc"]
    );
    expect(note).not.toBeNull();
  });

  it("returns null when slug not found", async () => {
    mockGet.mockResolvedValueOnce(undefined);

    const note = await getNoteByPublicSlug("bad-slug");

    expect(note).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setNoteCollaborative
// ---------------------------------------------------------------------------
describe("setNoteCollaborative", () => {
  it("returns null when note does not exist", async () => {
    mockGet.mockResolvedValueOnce(undefined);

    const result = await setNoteCollaborative("user-1", "note-1", true);

    expect(result).toBeNull();
  });

  it("sets is_collaborative to 1 when enabling", async () => {
    const existing = makeNoteRow();
    const updated = makeNoteRow({ is_collaborative: 1 });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    const result = await setNoteCollaborative("user-1", "note-1", true);

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("is_collaborative = ?"),
      expect.arrayContaining([1])
    );
    expect(result!.isCollaborative).toBe(true);
  });

  it("sets is_collaborative to 0 when disabling", async () => {
    const existing = makeNoteRow({ is_collaborative: 1 });
    const updated = makeNoteRow({ is_collaborative: 0 });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    await setNoteCollaborative("user-1", "note-1", false);

    expect(mockRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([0])
    );
  });
});

// ---------------------------------------------------------------------------
// updateCollaborativeNote
// ---------------------------------------------------------------------------
describe("updateCollaborativeNote", () => {
  it("returns null when note is not collaborative and not owned by user", async () => {
    mockGet.mockResolvedValueOnce(undefined);

    const result = await updateCollaborativeNote("note-1", "user-2", { title: "New" });

    expect(result).toBeNull();
  });

  it("updates a collaborative note", async () => {
    const existing = makeNoteRow({ is_collaborative: 1 });
    const updated = makeNoteRow({ title: "Updated", is_collaborative: 1 });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    const result = await updateCollaborativeNote("note-1", "user-99", { title: "Updated" });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE notes SET title"),
      expect.arrayContaining(["Updated"])
    );
    expect(result).not.toBeNull();
  });

  it("allows owner to update even if not collaborative", async () => {
    const existing = makeNoteRow({ is_collaborative: 0, user_id: "user-1" });
    const updated = makeNoteRow({ title: "Owner update" });
    mockGet
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    const result = await updateCollaborativeNote("note-1", "user-1", { title: "Owner update" });

    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteNoteScan
// ---------------------------------------------------------------------------
describe("deleteNoteScan", () => {
  it("returns false when scan not found", async () => {
    mockGet.mockResolvedValueOnce(undefined);

    const result = await deleteNoteScan("scan-1", "note-1");

    expect(result).toBe(false);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("deletes scan and returns true when found", async () => {
    mockGet.mockResolvedValueOnce(makeScanRow());

    const result = await deleteNoteScan("scan-1", "note-1");

    expect(result).toBe(true);
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM note_scans"),
      ["scan-1"]
    );
  });
});

// ---------------------------------------------------------------------------
// deleteNotePhoto
// ---------------------------------------------------------------------------
describe("deleteNotePhoto", () => {
  it("returns null when photo not found", async () => {
    mockGet.mockResolvedValueOnce(undefined);

    const result = await deleteNotePhoto("photo-1", "note-1");

    expect(result).toBeNull();
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("deletes photo and returns filename when found", async () => {
    mockGet.mockResolvedValueOnce(makePhotoRow());

    const result = await deleteNotePhoto("photo-1", "note-1");

    expect(result).toBe("abc123.jpg");
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM note_photos"),
      ["photo-1"]
    );
  });
});

// ---------------------------------------------------------------------------
// addNoteScan / getScansByNoteId
// ---------------------------------------------------------------------------
describe("addNoteScan", () => {
  it("inserts scan and returns mapped NoteScan", async () => {
    const row = makeScanRow({ id: "test-id" });
    mockGet.mockResolvedValueOnce(row);

    const scan = await addNoteScan("note-1", "https://example.com", "qr_code");

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO note_scans"),
      ["test-id", "note-1", "https://example.com", "qr_code"]
    );
    expect(scan.rawValue).toBe("https://example.com");
    expect(scan.format).toBe("qr_code");
  });
});

describe("getScansByNoteId", () => {
  it("returns mapped scans for a note", async () => {
    mockQuery.mockResolvedValueOnce([makeScanRow(), makeScanRow({ id: "scan-2" })]);

    const scans = await getScansByNoteId("note-1");

    expect(scans).toHaveLength(2);
    expect(scans[0].noteId).toBe("note-1");
  });
});

// ---------------------------------------------------------------------------
// addNotePhoto / getPhotosByNoteId
// ---------------------------------------------------------------------------
describe("addNotePhoto", () => {
  it("inserts photo and returns mapped NotePhoto", async () => {
    const row = makePhotoRow({ id: "test-id" });
    mockGet.mockResolvedValueOnce(row);

    const photo = await addNotePhoto("note-1", "abc123.jpg");

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO note_photos"),
      ["test-id", "note-1", "abc123.jpg"]
    );
    expect(photo.filename).toBe("abc123.jpg");
    expect(photo.noteId).toBe("note-1");
  });
});

describe("getPhotosByNoteId", () => {
  it("returns mapped photos for a note", async () => {
    mockQuery.mockResolvedValueOnce([makePhotoRow(), makePhotoRow({ id: "photo-2" })]);

    const photos = await getPhotosByNoteId("note-1");

    expect(photos).toHaveLength(2);
    expect(photos[0].filename).toBe("abc123.jpg");
  });
});
