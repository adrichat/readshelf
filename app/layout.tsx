import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Script from "next/script"
import { Providers } from "@/components/Providers"
import { ThemeProvider } from "@/components/ThemeProvider"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

export const metadata: Metadata = {
  title: "ReadShelf — Le Link-in-Bio des lecteurs",
  description: "Bibliothèque, réseaux, tous tes liens : une seule page à glisser dans ta bio. Le Link-in-Bio pensé pour les lecteurs.",
}

// Pose la classe .dark/.light sur <html> avant l'hydratation (le dashboard
// a un toggle clair/sombre ; sans ce script on aurait un flash au chargement)
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.classList.add(theme);
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full bg-background text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
