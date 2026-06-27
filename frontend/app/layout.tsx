import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tactical Lens — AI Football Analysis",
  description:
    "Three AI agents (IBM Granite) explain WHY moments happen in World Cup matches — tactical shifts, momentum swings, and referee decisions.",
  openGraph: {
    title: "Tactical Lens — AI Football Analysis",
    description: "AI agents explain why moments happen, not just what happened.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚽</text></svg>" />
      </head>
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span className="text-emerald-400">Tactical</span>
              <span>Lens</span>
            </Link>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="hidden sm:inline">Powered by IBM Granite</span>
              <a
                href="https://www.ibm.com/granite"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-neutral-700 px-3 py-1 transition hover:border-emerald-600 hover:text-emerald-400"
              >
                IBM Granite
              </a>
            </div>
          </div>
        </nav>

        {children}

        <footer className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-600">
          <p>
            Tactical Lens — Built with{" "}
            <a
              href="https://www.ibm.com/granite"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition hover:text-emerald-400"
            >
              IBM Granite
            </a>{" "}
            · LangChain · FastAPI · Next.js
          </p>
        </footer>
      </body>
    </html>
  );
}
