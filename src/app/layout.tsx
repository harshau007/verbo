"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { useState } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verbo</title>
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased m-5 lg:m-0",
          inter.className
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center justify-between px-4">
              <Link href="/" className="text-lg font-bold">
                Verbo
              </Link>

              <button
                className="md:hidden p-2"
                aria-label="Toggle navigation"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <Menu className="h-6 w-6" />
              </button>

              <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                <Link
                  href="/"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  Dashboard
                </Link>
                {/* <Link
                  href="/self-test"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  Self Test
                </Link> */}
                <Link
                  href="/settings"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  Settings
                </Link>
              </nav>
            </div>

            {menuOpen && (
              <div className="md:hidden border-t bg-background px-4 pb-4">
                <nav className="flex flex-col space-y-2 text-sm">
                  <Link
                    href="/"
                    className="block py-2 transition-colors hover:text-foreground/80 text-foreground/60"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {/* <Link
                    href="/self-test"
                    className="block py-2 transition-colors hover:text-foreground/80 text-foreground/60"
                    onClick={() => setMenuOpen(false)}
                  >
                    Self Test
                  </Link> */}
                  <Link
                    href="/settings"
                    className="block py-2 transition-colors hover:text-foreground/80 text-foreground/60"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                </nav>
              </div>
            )}
          </header>

          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
