import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import { AuthSessionProvider } from "@/components/providers/auth-session-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const themeInitScript = `
(() => {
  const storageKey = "opsbrain-theme";
  const root = document.documentElement;

  try {
    const savedTheme = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (prefersDark ? "dark" : "light");

    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: "OpsBrain AI",
  description: "Operational Intelligence Layer for enterprise operations teams.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Script id="opsbrain-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
