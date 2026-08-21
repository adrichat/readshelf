import type { Metadata, Viewport } from "next"
import { Geist, Caprasimo } from "next/font/google"
import Script from "next/script"
import { Providers } from "@/components/Providers"
import { ThemeProvider } from "@/components/ThemeProvider"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
// Police display du logo animé (page d'accueil) — voir components/landing/AnimatedLogo.tsx
const caprasimo = Caprasimo({ weight: "400", subsets: ["latin"], variable: "--font-caprasimo" })

export const metadata: Metadata = {
  title: "ReadShelf — Le Link-in-Bio des lecteurs",
  description: "Bibliothèque, réseaux, tous tes liens : une seule page à glisser dans ta bio. Le Link-in-Bio pensé pour les lecteurs.",
}

// Pas de zoom pinch/double-tap sur mobile : l'app est déjà responsive et le
// zoom ne fait que casser la mise en page. Complété par `touch-action` dans
// globals.css, seul levier respecté par Safari iOS (qui ignore user-scalable).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
    <html lang="fr" className={`${geist.variable} ${caprasimo.variable} h-full`} suppressHydrationWarning>
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
