import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "W&S 132 · Wesley & Suelaine",
  description: "Nosso espaço para cuidar dos sonhos, guardar as memórias e construir uma vida a dois.",
  robots: { index: false, follow: false, noarchive: true },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
