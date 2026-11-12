import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "بولو، دیکھو، جانو — AgriYield Voice Slice",
  description:
    "کسان بول کر پوچھے — اردو میں جواب سنے اور دیکھے۔ موسم، مٹی اور منڈی کے اعداد کے ساتھ۔ Catalyst Solo AI Hackathon, Nov 15, 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
