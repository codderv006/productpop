import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ProductPop — product marketing, powered by your Claude",
  description: "Turn your product into ready-to-share posts, carousels and Reels, straight from Claude.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
