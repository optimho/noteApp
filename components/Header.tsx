import Link from "next/link";
import HeaderAuth from "./HeaderAuth";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">

        </Link>
        <HeaderAuth />
      </div>
    </header>
  );
}
