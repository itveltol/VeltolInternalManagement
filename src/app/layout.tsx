import type { Metadata, Viewport } from "next";
import { Exo_2, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const exo2 = Exo_2({
  weight: "variable",
  subsets: ["latin"],
  variable: "--font-exo2",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Veltol Project Cloud",
  description: "Veltol Holding S.R.L. belső projektmenedzsment platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`dark ${exo2.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
