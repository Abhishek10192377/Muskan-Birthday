import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "For Muskan",
  description: "Some stories should never have been opened.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
