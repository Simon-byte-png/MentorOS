import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MentorOS",
  description: "A quiet intellectual dialogue space with memory."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
