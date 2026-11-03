
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JAMB CBT | Practice and Prepare",
  description:
    "Prepare for your JAMB UTME with practice questions, mock examinations, and performance assessments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
