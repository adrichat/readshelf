import type { SocialKey } from "@/lib/social-links"

interface IconProps {
  className?: string
}

// Pictogrammes simples (traits, currentColor) pour chaque réseau : reprennent
// la silhouette reconnaissable de chaque app sans dépendre d'une lib externe,
// et héritent la couleur d'accent du profil comme le faisait le texte avant.
function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.5 9.2 L15.5 12 L10.5 14.8 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SpotifyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M7 10.2c3.2-1 7-.7 9.6.9" strokeLinecap="round" />
      <path d="M7.3 13c2.6-.8 5.6-.6 7.8.7" strokeLinecap="round" />
      <path d="M7.6 15.7c2-.6 4.3-.4 6 .6" strokeLinecap="round" />
    </svg>
  )
}

function GoodreadsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8.5 8v8" strokeLinecap="round" />
      <path d="M8.5 8c3.2-.6 6.5.4 6.5 3.2 0 2-1.7 3-3.6 2.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BabelioIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 5.5c3-1 6-1 8 0v13c-2-1-5-1-8 0Z" strokeLinejoin="round" />
      <path d="M20 5.5c-3-1-6-1-8 0v13c2-1 5-1 8 0Z" strokeLinejoin="round" />
    </svg>
  )
}

function BooknodeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 3.5h9.5a2.5 2.5 0 0 1 2.5 2.5v14.5H8.5A2.5 2.5 0 0 1 6 18Z" strokeLinejoin="round" />
      <path d="M6 18h12" />
    </svg>
  )
}

function LinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M9.5 14.5 14.5 9.5" strokeLinecap="round" />
      <path d="M11 6.5 12.4 5.1a4 4 0 0 1 5.7 5.7L16.7 12" strokeLinecap="round" />
      <path d="M13 17.5 11.6 18.9a4 4 0 0 1-5.7-5.7L7.3 12" strokeLinecap="round" />
    </svg>
  )
}

const ICONS: Record<SocialKey, (props: IconProps) => React.JSX.Element> = {
  goodreads: GoodreadsIcon,
  babelio: BabelioIcon,
  instagram: InstagramIcon,
  booknode: BooknodeIcon,
  youtube: YoutubeIcon,
  spotify: SpotifyIcon,
}

export function SocialIcon({ social, className }: { social: SocialKey; className?: string }) {
  const Icon = ICONS[social]
  return <Icon className={className} />
}

export { LinkIcon as CustomLinkIcon }
