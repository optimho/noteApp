import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">NoteApp</h1>
      <p className="text-neutral-600 text-lg max-w-md">
        A minimal rich-text note taking app. Create, edit, and share notes with
        formatting.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-5 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="px-5 py-2 rounded-md border border-neutral-300 hover:bg-neutral-100 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
