import type { Metadata } from "next";
import { Darker_Grotesque } from "next/font/google";
import "./globals.css";


const darkerGrotesque = Darker_Grotesque({
  variable: "--font-darker-grotesque",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EIOS Demos",
  description: "Interactive demos for EIOS project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${darkerGrotesque.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
