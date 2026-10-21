import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DON'T WAKE HIM · A Sneaky Little Adventure",
  description: "Three mischievous missions. One very light sleeper. A colorful stealth-comedy game.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18172d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-night text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
