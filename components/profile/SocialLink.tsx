"use client"

interface SocialLinkProps {
  href: string
  appHref?: string | null
  className?: string
  style?: React.CSSProperties
  title?: string
  "aria-label"?: string
  children: React.ReactNode
}

// Tente d'ouvrir l'app native (via son URI scheme) sur mobile, et se rabat
// sur le lien web si l'app ne réagit pas dans un délai court. Sur desktop,
// ou quand aucun deep link n'est connu pour ce réseau, comportement de lien
// classique inchangé.
export function SocialLink({
  href,
  appHref,
  className,
  style,
  title,
  "aria-label": ariaLabel,
  children,
}: SocialLinkProps) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!appHref) return

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isMobile) return

    e.preventDefault()

    let settled = false

    const cleanup = () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      clearTimeout(timer)
    }

    const onVisibilityChange = () => {
      // La page passe en arrière-plan : l'app s'est probablement ouverte.
      if (document.hidden && !settled) {
        settled = true
        cleanup()
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      window.open(href, "_blank", "noopener,noreferrer")
    }, 1500)

    window.location.href = appHref
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      title={title}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
