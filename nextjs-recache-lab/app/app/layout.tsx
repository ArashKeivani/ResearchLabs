import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Re:CACHE Training Lab",
  description: "Local training lab for RSC content-type confusion and cache poisoning."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
