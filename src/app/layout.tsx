import type { Metadata } from "next";
import { Inconsolata } from "next/font/google";
import "./globals.css";

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
});

export const metadata: Metadata = {
  title: "Live Classroom",
  description: "A live TV channel of 1970s-cartoon lessons generated with MiniMax H3 Max, with a program guide for queueing what plays next.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={inconsolata.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
