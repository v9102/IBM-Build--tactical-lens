import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tactical Lens",
  description: "AI agents explain WHY moments happen in World Cup matches.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
