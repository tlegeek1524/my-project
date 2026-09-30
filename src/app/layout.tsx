import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบจดบันทึกเงินกู้และค่างวด",
  description: "บันทึกและติดตามค่างวดการชำระเงินแบบง่าย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased font-sans`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
