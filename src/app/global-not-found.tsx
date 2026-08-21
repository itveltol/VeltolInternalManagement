import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found — Veltol Project Cloud",
  description: "The page you're looking for doesn't exist or may have been moved.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-full bg-veltol-bg antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-veltol-surface">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7 text-veltol-fgDim"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
              <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-veltol-fg">Page not found</h1>
            <p className="text-sm text-veltol-fgDim">
              The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md bg-veltol-primary px-4 text-sm font-medium text-white hover:bg-veltol-primaryHi"
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
