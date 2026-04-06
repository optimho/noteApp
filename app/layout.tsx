import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "NoteApp",
  description: "A simple rich-text note taking app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-blue-50 text-neutral-900" suppressHydrationWarning>
        <Header />
        <main className="max-w-4xl mx-auto px-4 pt-4 pb-8">{children}</main>
      </body>
    </html>
  );
}
