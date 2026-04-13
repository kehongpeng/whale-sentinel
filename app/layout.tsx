import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whale Sentinel — 币安大户监控",
  description: "币安 U 本位永续合约大户行为监控与三阶段预警",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
