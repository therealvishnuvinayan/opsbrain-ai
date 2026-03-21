import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";

import { AuthSessionProvider } from "@/components/providers/auth-session-provider";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
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
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : "light";

    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <Script id="opsbrain-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
