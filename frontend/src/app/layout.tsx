import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Pinspire — discover and save ideas",
  description: "A visual discovery board for saving and sharing ideas.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<div className="min-h-screen" />}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
