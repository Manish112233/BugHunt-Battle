import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugHunt Battle | Ship the fix first",
  description: "A real-time 1v1 coding battle arena.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
