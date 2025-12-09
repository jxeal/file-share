import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignedIn, SignedOut, SignIn } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACP Production",
  description: "Nuvoco File Sharing Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {/* <SignedOut>
            <div className="min-h-screen min-w-screen flex items-center justify-center">
              <SignIn routing="hash" />
            </div>
          </SignedOut>
          <SignedIn>
          </SignedIn> */}
          <BackgroundSlideshow>{children}</BackgroundSlideshow>
          <Toaster position="top-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
