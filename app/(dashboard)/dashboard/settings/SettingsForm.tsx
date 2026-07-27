"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  SOCIAL_FIELDS,
  isValidSocialUrl,
  normalizeSocialUrl,
  isValidCustomLinkUrl,
  CUSTOM_LINK_TITLE_MAX,
} from "@/lib/social-links"

interface Props {
  isPremium: boolean
  initialData: {
    displayName: string
    bio: string
    image: string | null
    username: string
    email: string
    goodreads: string
    babelio: string
    instagram: string
    booknode: string
    youtube: string
    spotify: string
    customLinkTitle: string
    customLinkUrl: string
    seoTitle: string
    seoDescription: string
  }
}

const STATIC_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

function readAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Recadre au centre en carré et compresse — l'avatar est stocké en base
async function resizeToSquareDataUrl(file: File, size = 256) {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  )
  bitmap.close()
  // Retombe automatiquement sur du PNG si le navigateur n'encode pas le WebP
  return canvas.toDataURL("image/webp", 0.85)
}

export function SettingsForm({ isPremium, initialData }: Props) {
  const [displayName, setDisplayName] = useState(initialData.displayName)
  const [bio, setBio] = useState(initialData.bio)
  const [image, setImage] = useState<string | null>(initialData.image)
  const [imageDirty, setImageDirty] = useState(false)
  const [avatarError, setAvatarError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const [socials, setSocials] = useState({
    goodreads: initialData.goodreads,
    babelio: initialData.babelio,
    instagram: initialData.instagram,
    booknode: initialData.booknode,
    youtube: initialData.youtube,
    spotify: initialData.spotify,
  })
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({})
  const [customLinkTitle, setCustomLinkTitle] = useState(initialData.customLinkTitle)
  const [customLinkUrl, setCustomLinkUrl] = useState(initialData.customLinkUrl)
  const [customLinkError, setCustomLinkError] = useState("")
  const [seoTitle, setSeoTitle] = useState(initialData.seoTitle)
  const [seoDescription, setSeoDescription] = useState(initialData.seoDescription)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Permet de re-sélectionner le même fichier après une erreur
    e.target.value = ""
    if (!file) return
    setAvatarError("")
    try {
      if (file.type === "image/gif") {
        if (!isPremium) {
          setAvatarError("Les GIF animés sont réservés aux comptes Premium.")
          return
        }
        if (file.size > 3 * 1024 * 1024) {
          setAvatarError("GIF trop lourd : 3 Mo maximum.")
          return
        }
        // Pas de recadrage canvas : il ferait perdre l'animation
        setImage(await readAsDataURL(file))
      } else if (STATIC_IMAGE_TYPES.includes(file.type)) {
        if (file.size > 10 * 1024 * 1024) {
          setAvatarError("Image trop lourde : 10 Mo maximum.")
          return
        }
        setImage(await resizeToSquareDataUrl(file))
      } else {
        setAvatarError(
          isPremium
            ? "Format non supporté : JPG, PNG, WebP ou GIF."
            : "Format non supporté : JPG, PNG ou WebP."
        )
        return
      }
      setImageDirty(true)
    } catch {
      setAvatarError("Impossible de lire cette image.")
    }
  }

  async function save() {
    setError("")

    // Normalise (ajoute https:// si absent) puis vérifie que chaque lien
    // pointe bien vers le bon domaine avant tout envoi au serveur
    const normalizedSocials = Object.fromEntries(
      SOCIAL_FIELDS.map((f) => [f.key, normalizeSocialUrl(socials[f.key])])
    ) as typeof socials

    const errors: Record<string, string> = {}
    for (const field of SOCIAL_FIELDS) {
      const value = normalizedSocials[field.key]
      if (value && !isValidSocialUrl(field.key, value)) {
        errors[field.key] = `Doit être un lien ${field.label} valide (${field.hosts[0]})`
      }
    }
    setSocialErrors(errors)

    // Lien libre : même logique — titre et URL vont ensemble, l'un sans l'autre n'a pas de sens
    const trimmedTitle = customLinkTitle.trim()
    const normalizedCustomUrl = normalizeSocialUrl(customLinkUrl)
    let customErr = ""
    if (normalizedCustomUrl && !isValidCustomLinkUrl(normalizedCustomUrl)) {
      customErr = "URL invalide."
    } else if (normalizedCustomUrl && !trimmedTitle) {
      customErr = "Ajoute un titre pour ce lien."
    } else if (!normalizedCustomUrl && trimmedTitle) {
      customErr = "Ajoute une URL pour ce lien."
    }
    setCustomLinkError(customErr)

    if (Object.keys(errors).length > 0 || customErr) {
      setError("Corrige les liens invalides avant de sauvegarder.")
      return
    }
    setSocials(normalizedSocials)
    setCustomLinkUrl(normalizedCustomUrl)

    setSaving(true)
    const requests = [
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          socialLinks: {
            ...normalizedSocials,
            customLinkTitle: trimmedTitle,
            customLinkUrl: normalizedCustomUrl,
          },
          ...(imageDirty && { image }),
        }),
      }),
    ]
    if (isPremium) {
      requests.push(
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seoTitle, seoDescription }),
        })
      )
    }
    const results = await Promise.all(requests)
    setSaving(false)
    if (results.every((r) => r.ok)) {
      setImageDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const failed = results.find((r) => !r.ok)
      let message = "Une erreur est survenue."
      try {
        const data = await failed?.json()
        if (data?.error === "PREMIUM_REQUIRED")
          message = "Les GIF animés sont réservés aux comptes Premium."
        else if (data?.error === "IMAGE_TOO_LARGE") message = "Image trop lourde."
        else if (data?.error === "INVALID_IMAGE") message = "Format d'image invalide."
        else if (data?.error === "INVALID_SOCIAL_LINK") message = "Un des liens sociaux est invalide."
        else if (data?.error === "INVALID_CUSTOM_LINK") message = "Le lien libre est invalide."
      } catch {
        // réponse sans corps JSON — on garde le message générique
      }
      setError(message)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Identité */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-300 border-b border-white/8 pb-2">Identité</h2>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Photo de profil</Label>
          <div className="flex items-center gap-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="w-16 h-16 rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 flex items-center justify-center text-xl font-bold shrink-0">
                {(displayName || initialData.username || "?").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-gray-300 hover:border-white/25 hover:text-white transition-colors"
                >
                  Changer la photo
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null)
                      setImageDirty(true)
                      setAvatarError("")
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-gray-500 hover:border-red-500/40 hover:text-red-400 transition-colors"
                  >
                    Retirer
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600">
                JPG, PNG ou WebP — recadrée en carré.
                {isPremium && <span className="text-violet-400"> GIF animé accepté ✦</span>}
              </p>
              {!isPremium && (
                <p className="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                    <Sparkles className="w-3 h-3" />
                    Premium
                  </span>
                  GIF animé réservé aux comptes Premium —{" "}
                  <Link
                    href="/dashboard/premium"
                    className="text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Débloquer →
                  </Link>
                </p>
              )}
            </div>
          </div>
          {avatarError && <p className="text-xs text-red-400 mt-2">{avatarError}</p>}
          <input
            ref={fileRef}
            type="file"
            accept={
              isPremium
                ? "image/jpeg,image/png,image/webp,image/gif"
                : "image/jpeg,image/png,image/webp"
            }
            onChange={handleAvatarFile}
            className="hidden"
          />
        </div>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">URL de ton profil</Label>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500">
            readshelf.dev/<span className="text-white">{initialData.username}</span>
          </div>
        </div>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Email</Label>
          <Input value={initialData.email} disabled className="bg-white/5 border-white/10 text-gray-500" />
        </div>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Nom affiché</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ton prénom ou pseudo"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
          />
        </div>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Quelques mots sur toi ou tes lectures…"
            rows={3}
            maxLength={200}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{bio.length}/200</p>
        </div>
      </div>

      {/* Liens sociaux */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-300 border-b border-white/8 pb-2">Liens sociaux</h2>
        <p className="text-xs text-gray-600 -mt-2">Ces liens s&apos;affichent sur ta page publique.</p>

        {SOCIAL_FIELDS.map((field) => (
          <div key={field.key}>
            <Label className="text-sm text-gray-400 mb-2 block">{field.label}</Label>
            <Input
              value={socials[field.key]}
              onChange={(e) => {
                setSocials((prev) => ({ ...prev, [field.key]: e.target.value }))
                setSocialErrors((prev) => ({ ...prev, [field.key]: "" }))
              }}
              onBlur={(e) => {
                const value = normalizeSocialUrl(e.target.value)
                if (value && !isValidSocialUrl(field.key, value)) {
                  setSocialErrors((prev) => ({
                    ...prev,
                    [field.key]: `Doit être un lien ${field.label} valide (${field.hosts[0]})`,
                  }))
                }
              }}
              placeholder={field.placeholder}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm"
            />
            {socialErrors[field.key] && (
              <p className="text-xs text-red-400 mt-1">{socialErrors[field.key]}</p>
            )}
          </div>
        ))}

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Lien libre — titre</Label>
          <Input
            value={customLinkTitle}
            onChange={(e) => {
              setCustomLinkTitle(e.target.value.slice(0, CUSTOM_LINK_TITLE_MAX))
              setCustomLinkError("")
            }}
            placeholder="Mon site, ma chaîne Twitch…"
            maxLength={CUSTOM_LINK_TITLE_MAX}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">
            {customLinkTitle.length}/{CUSTOM_LINK_TITLE_MAX}
          </p>
        </div>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Lien libre — URL</Label>
          <Input
            value={customLinkUrl}
            onChange={(e) => {
              setCustomLinkUrl(e.target.value)
              setCustomLinkError("")
            }}
            onBlur={(e) => {
              const value = normalizeSocialUrl(e.target.value)
              if (value && !isValidCustomLinkUrl(value)) {
                setCustomLinkError("URL invalide.")
              }
            }}
            placeholder="https://..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm"
          />
          {customLinkError && <p className="text-xs text-red-400 mt-1">{customLinkError}</p>}
        </div>
      </div>

      {/* SEO — Premium */}
      <div className={`flex flex-col gap-4 ${isPremium ? "" : "opacity-60"}`}>
        <h2 className="text-sm font-semibold text-gray-300 border-b border-white/8 pb-2 flex items-center">
          SEO
          {!isPremium && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 ml-2 font-normal">
              <Sparkles className="w-3 h-3" />
              Premium
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-600 -mt-2">
          Personnalise le titre et la description de ta page dans les résultats de recherche.
        </p>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Titre SEO</Label>
          <Input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="Ma bibliothèque — Prénom"
            maxLength={60}
            disabled={!isPremium}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
          />
        </div>

        <div>
          <Label className="text-sm text-gray-400 mb-2 block">Description SEO</Label>
          <Textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder="Découvre mes lectures, mes coups de cœur…"
            rows={2}
            maxLength={160}
            disabled={!isPremium}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none"
          />
        </div>

        {!isPremium && (
          <Link
            href="/dashboard/premium"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Débloquer avec Premium →
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        onClick={save}
        disabled={saving}
        className="self-start bg-violet-600 hover:bg-violet-700 text-white px-8"
      >
        {saved ? "Sauvegardé ✓" : saving ? "Sauvegarde…" : "Sauvegarder"}
      </Button>
    </div>
  )
}
