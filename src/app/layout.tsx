import type { Metadata, Viewport } from "next";
import { Inconsolata } from "next/font/google";
import "./globals.css";

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
});

export const metadata: Metadata = {
  title: "Canal Megafón · clases de marketing en directo",
  description: "Un canal de televisión que da clases de marketing: dibujos animados de los años 70 generados con MiniMax H3 Max y una guía para encolar la siguiente clase.",
};

// viewportFit: "cover" lets the overlays pad themselves with env(safe-area-inset-*) on notched phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0805",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={inconsolata.variable} lang="es">
      <body>{children}</body>
    </html>
  );
}
