import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import NextAuthSessionProvider from "@/lib/session-provider";
import "./globals.css";

const inter = localFont({
  src: "./font/InterVariable.ttf",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Albert - AI-Powered Campaign Generator",
  description:
    "Albert transforms media ideation with AI-powered campaign generation. Upload your knowledge base of past campaigns and let Albert generate targeted ideas for brands using Gemini File Search and advanced analytics. Perfect for TV channels, digital media, and advertising agencies.",
  icons: {
    icon: [{ url: "/albert.png", type: "image/png" }],
    apple: [{ url: "/albert.png", type: "image/png" }],
    shortcut: "/albert.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${inter.className} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
        >
          <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
