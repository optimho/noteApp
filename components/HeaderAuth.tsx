"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function HeaderAuth() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (session) {
    return (
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <span className="text-neutral-700 font-medium">
          {session.user.name || session.user.email}
        </span>
        <button onClick={handleSignOut} className="text-neutral-600 hover:underline">
          Log out
        </button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/login" className="hover:underline">
        Log in
      </Link>
      <Link
        href="/register"
        className="px-3 py-1 bg-neutral-900 text-white rounded-md hover:bg-neutral-700 transition-colors"
      >
        Sign up
      </Link>
    </nav>
  );
}
