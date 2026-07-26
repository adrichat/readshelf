"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Sparkles, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SOLID_PRESETS = [
  { label: "Nuit profonde", value: "#0a0a0a" },
  { label: "Encre", value: "#151538" },
  { label: "Forêt", value: "#12291a" },
  { label: "Bordeaux", value: "#2e0f1a" },
  { label: "Ardoise", value: "#1b2735" },
  { label: "Prune", value: "#251233" },
]

const GRADIENT_PRESETS = [
  { label: "Crépuscule", from: "#4c1d95", to: "#0a0a0a" },
  { label: "Océan", from: "#1e3a8a", to: "#0c1425" },
  { label: "Forêt", from: "#14532d", to: "#04140a" },
  { label: "Braise", from: "#7f1d1d", to: "#160808" },
  { label: "Aurore", from: "#831843", to: "#1e1b4b" },
  { label: "Doré", from: "#92400e", to: "#141210" },
]

const ACCENT_PRESETS = [
  { color: "#7c3aed", label: "Violet" },
  { color: "#2563eb", label: "Bleu" },
  { color: "#059669", label: "Émeraude" },
  { color: "#dc2626", label: "Rouge" },
  { color: "#d97706", label: "Ambre" },
  { color: "#db2777", label: "Rose" },
  { color: "#0891b2", label: "Cyan" },
  { color: "#65a30d", label: "Vert" },
]

const WOOD_PRESETS = [
  { label: "Chêne", value: "#7a4518" },
  { label: "Noyer", value: "#4a2e1a" },
  { label: "Acajou", value: "#6b2f1a" },
  { label: "Cerisier", value: "#8b3a2a" },
  { label: "Ébène", value: "#2a2622" },
  { label: "Pin", value: "#a8794a" },
]

const FONT_OPTIONS = [
  { value: "inter", label: "Inter", stack: "Inter, sans-serif" },
  { value: "playfair", label: "Playfair Display", stack: "'Playfair Display', Georgia, serif" },
  { value: "merriweather", label: "Merriweather", stack: "Merriweather, Georgia, serif" },
  { value: "crimson", label: "Crimson Text", stack: "'Crimson Text', Georgia, serif" },
]

const EFFECT_OPTIONS = [
  { value: null, label: "Aucun", desc: "Sobre" },
  { value: "PARTICLES", label: "Particules", desc: "Points flottants" },
  { value: "AMBIENT_GLOW", label: "Lueur", desc: "Halo animé" },
  { value: "NOISE", label: "Grain", desc: "Texture papier" },
]

// Un peu sous la limite serveur (6 Mo encodés en base64 ≈ 4,3 Mo bruts)
const BACKGROUND_GIF_MAX_BYTES = 4 * 1024 * 1024

function readAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function buildGradient(from: string, to: string) {
  return `linear-gradient(160deg, ${from} 0%, ${to} 100%)`
}

function extractGradientColors(value: string): [string, string] {
  const m = value.match(/#[0-9a-fA-F]{6}/g)
  return [m?.[0] ?? "#4c1d95", m?.[1] ?? "#0a0a0a"]
}

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 ml-2">
      <Sparkles className="w-3 h-3" />
      Premium
    </span>
  )
}

export default function AppearancePage() {
  const [isPremium, setIsPremium] = useState(false)
  const [bgType, setBgType] = useState<"COLOR" | "GRADIENT" | "IMAGE">("COLOR")
  const [bgValue, setBgValue] = useState("#0a0a0a")
  const [gifError, setGifError] = useState("")
  const gifInputRef = useRef<HTMLInputElement>(null)
  const [gradFrom, setGradFrom] = useState("#4c1d95")
  const [gradTo, setGradTo] = useState("#0a0a0a")
  const [accentColor, setAccentColor] = useState("#7c3aed")
  const [layout, setLayout] = useState("GRID")
  const [shelfColor, setShelfColor] = useState("#7a4518")
  const [fontFamily, setFontFamily] = useState("inter")
  const [effect, setEffect] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    fetch("/api/profile/me")
      .then((r) => r.json())
      .then((p) => {
        if (!p) return
        const type = p.backgroundType ?? "COLOR"
        const value = p.backgroundValue ?? "#0a0a0a"
        setBgType(type)
        setBgValue(value)
        setAccentColor(p.accentColor ?? "#7c3aed")
        setIsPremium(p.isPremium ?? false)
        // Les anciennes valeurs SHELF/MOSAIC retombent sur la grille
        setLayout(p.layoutType === "LIBRARY" ? "LIBRARY" : "GRID")
        setShelfColor(p.shelfColor ?? "#7a4518")
        setFontFamily(p.fontFamily ?? "inter")
        setEffect(p.effectType ?? null)
        if (type === "GRADIENT") {
          const [from, to] = extractGradientColors(value)
          setGradFrom(from)
          setGradTo(to)
        }
      })
  }, [])

  function applyGradient(from: string, to: string) {
    setGradFrom(from)
    setGradTo(to)
    setBgValue(buildGradient(from, to))
  }

  async function handleGifFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Permet de re-sélectionner le même fichier après une erreur
    e.target.value = ""
    if (!file) return
    setGifError("")
    if (file.type !== "image/gif") {
      setGifError("Seul le format GIF est accepté.")
      return
    }
    if (file.size > BACKGROUND_GIF_MAX_BYTES) {
      setGifError("GIF trop lourd : 4 Mo maximum.")
      return
    }
    try {
      // Pas de recadrage/compression : ça ferait perdre l'animation
      setBgValue(await readAsDataURL(file))
    } catch {
      setGifError("Impossible de lire ce fichier.")
    }
  }

  async function save() {
    setSaving(true)
    setSaveError("")
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backgroundType: bgType,
        backgroundValue: bgValue,
        accentColor,
        ...(isPremium && {
          layoutType: layout,
          shelfColor,
          fontFamily,
          effectType: effect,
        }),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      setSaveError("La sauvegarde a échoué. Réessaie.")
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const previewBg =
    bgType === "IMAGE" && bgValue.startsWith("data:image/gif")
      ? { backgroundImage: `url(${bgValue})`, backgroundSize: "cover", backgroundPosition: "center" }
      : bgType === "GRADIENT"
        ? { backgroundImage: bgValue }
        : { backgroundColor: bgValue }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Apparence</h1>
      <p className="text-sm text-gray-500 mb-8">Personnalise le style de ta page publique.</p>

      {/* Mini preview */}
      <div
        className="rounded-xl h-40 mb-8 overflow-hidden border border-white/10 relative"
        style={previewBg}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${accentColor}18 0%, transparent 50%)` }} />
        <div className="relative flex flex-col items-center pt-5 gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: `${accentColor}25`, border: `2px solid ${accentColor}50`, color: accentColor }}
          >
            A
          </div>
          <p className="text-xs text-white/80 font-medium">Ton profil</p>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-7 rounded-sm"
              style={{ height: 36 + i * 4, backgroundColor: accentColor, opacity: 0.5 + i * 0.07 }}
            />
          ))}
        </div>
        <p className="absolute bottom-1.5 right-3 text-xs opacity-30" style={{ color: accentColor }}>
          Aperçu
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Fond */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Arrière-plan</Label>

          <div className="flex gap-2 mb-4">
            {(["COLOR", "GRADIENT", "IMAGE"] as const).map((t) => {
              const locked = t === "IMAGE" && !isPremium
              return (
                <button
                  key={t}
                  onClick={() => {
                    if (locked) return
                    setBgType(t)
                    if (t === "COLOR") {
                      setBgValue("#0a0a0a")
                    } else if (t === "GRADIENT") {
                      setBgValue(buildGradient(gradFrom, gradTo))
                    }
                  }}
                  disabled={locked}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    bgType === t
                      ? "border-violet-500 bg-violet-500/10 text-white"
                      : locked
                        ? "border-white/10 text-gray-600 cursor-not-allowed"
                        : "border-white/10 text-gray-500 hover:border-white/20"
                  }`}
                >
                  {locked && <Lock className="w-3 h-3" />}
                  {t === "COLOR" ? "Couleur" : t === "GRADIENT" ? "Dégradé" : "GIF"}
                </button>
              )
            })}
          </div>

          {bgType === "COLOR" ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                {SOLID_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setBgValue(p.value)}
                    title={p.label}
                    className={`h-16 rounded-xl border-2 transition-all flex items-end justify-center pb-1.5 ${
                      bgValue === p.value ? "border-white scale-[1.02]" : "border-white/15 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: p.value }}
                  >
                    <span className="text-xs font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex flex-col items-center gap-1.5">
                  <Input
                    type="color"
                    value={bgValue.startsWith("#") ? bgValue : "#0a0a0a"}
                    onChange={(e) => setBgValue(e.target.value)}
                    className="w-10 h-10 p-1 rounded-full cursor-pointer bg-transparent border-white/20"
                  />
                  <span className="text-xs text-gray-500">Perso</span>
                </div>
                <div
                  className="flex-1 h-9 rounded-lg border border-white/10"
                  style={{ backgroundColor: bgValue }}
                />
              </div>
            </div>
          ) : bgType === "GRADIENT" ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                {GRADIENT_PRESETS.map((g) => {
                  const value = buildGradient(g.from, g.to)
                  const active = bgValue === value
                  return (
                    <button
                      key={g.label}
                      onClick={() => applyGradient(g.from, g.to)}
                      className={`h-16 rounded-xl border-2 transition-all flex items-end justify-center pb-1.5 ${
                        active ? "border-white scale-[1.02]" : "border-white/15 hover:border-white/40"
                      }`}
                      style={{ backgroundImage: value }}
                      title={g.label}
                    >
                      <span className="text-xs font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {g.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex flex-col items-center gap-1.5">
                  <Input
                    type="color"
                    value={gradFrom}
                    onChange={(e) => applyGradient(e.target.value, gradTo)}
                    className="w-10 h-10 p-1 rounded-full cursor-pointer bg-transparent border-white/20"
                  />
                  <span className="text-xs text-gray-500">Début</span>
                </div>
                <div
                  className="flex-1 h-9 rounded-lg border border-white/10"
                  style={{ backgroundImage: buildGradient(gradFrom, gradTo) }}
                />
                <div className="flex flex-col items-center gap-1.5">
                  <Input
                    type="color"
                    value={gradTo}
                    onChange={(e) => applyGradient(gradFrom, e.target.value)}
                    className="w-10 h-10 p-1 rounded-full cursor-pointer bg-transparent border-white/20"
                  />
                  <span className="text-xs text-gray-500">Fin</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bgValue.startsWith("data:image/gif") ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 h-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bgValue} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-40 rounded-xl border border-dashed border-white/15 flex items-center justify-center text-sm text-gray-600">
                  Aucun GIF sélectionné
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={() => gifInputRef.current?.click()}
                  variant="outline"
                  className="w-fit border-white/10 bg-white/5 hover:bg-white/10 text-white"
                >
                  Choisir un GIF
                </Button>
                {bgValue.startsWith("data:image/gif") && (
                  <Button
                    type="button"
                    onClick={() => {
                      setBgType("COLOR")
                      setBgValue("#0a0a0a")
                    }}
                    variant="outline"
                    className="w-fit border-white/10 bg-white/5 hover:bg-white/10 text-gray-400"
                  >
                    Retirer
                  </Button>
                )}
              </div>
              <input
                ref={gifInputRef}
                type="file"
                accept="image/gif"
                onChange={handleGifFile}
                className="hidden"
              />
              {gifError && <p className="text-xs text-red-400">{gifError}</p>}
              <p className="text-xs text-gray-600">GIF uniquement, 4 Mo maximum — l&apos;animation est conservée telle quelle.</p>
            </div>
          )}
        </div>

        {/* Couleur d'accent */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Couleur d&apos;accentuation</Label>
          <div className="flex items-center gap-3 flex-wrap">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.color}
                onClick={() => setAccentColor(p.color)}
                title={p.label}
                className={`w-9 h-9 rounded-full border-2 transition-all ${accentColor === p.color ? "border-white scale-110" : "border-transparent hover:border-white/30"}`}
                style={{ backgroundColor: p.color }}
              />
            ))}
            <Input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-10 h-10 p-1 rounded-full cursor-pointer bg-transparent border-white/20"
            />
          </div>
        </div>

        {/* ── Sections Premium ── */}

        {/* Disposition */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Disposition des livres</Label>
          <div className="flex gap-3 flex-wrap">
            {/* Grille — gratuit */}
            <button
              onClick={() => setLayout("GRID")}
              className={`flex-1 min-w-36 p-4 rounded-xl border text-left transition-colors hover:bg-white/5 ${
                layout === "GRID"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="text-xl mb-1">⊞</div>
              <p className="text-sm font-medium">Grille</p>
              <p className="text-xs text-gray-500 mt-0.5">Classique, couvertures alignées</p>
            </button>

            {/* Bibliothèque — premium */}
            <button
              onClick={() => isPremium && setLayout("LIBRARY")}
              disabled={!isPremium}
              className={`flex-1 min-w-36 p-4 rounded-xl border text-left transition-colors ${
                layout === "LIBRARY"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 bg-white/[0.02]"
              } ${isPremium ? "hover:bg-white/5" : "opacity-60 cursor-not-allowed"}`}
            >
              <div className="text-xl mb-1">📚</div>
              <p className="text-sm font-medium">
                Bibliothèque
                {!isPremium && <PremiumBadge />}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Étagères en bois, taille dynamique</p>
            </button>
          </div>

          {/* Personnalisation du bois — visible si Bibliothèque sélectionnée */}
          {layout === "LIBRARY" && isPremium && (
            <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <p className="text-xs font-medium text-gray-400 mb-3">Couleur du bois</p>
              <div className="flex items-center gap-3 flex-wrap">
                {WOOD_PRESETS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => setShelfColor(w.value)}
                    title={w.label}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      shelfColor === w.value ? "border-white scale-110" : "border-white/20 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: w.value }}
                  />
                ))}
                <Input
                  type="color"
                  value={shelfColor}
                  onChange={(e) => setShelfColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded-full cursor-pointer bg-transparent border-white/20"
                />
              </div>

              {/* Aperçu de l'étagère */}
              <div
                className="mt-4 rounded-lg overflow-hidden relative"
                style={{ backgroundColor: `color-mix(in srgb, ${shelfColor} 22%, black)`, height: 76 }}
              >
                <div className="absolute bottom-3 left-4 right-4 flex items-end gap-2">
                  {[38, 46, 42, 50, 40].map((h, i) => (
                    <div
                      key={i}
                      className="w-7 rounded-sm"
                      style={{ height: h, backgroundColor: accentColor, opacity: 0.45 + i * 0.08 }}
                    />
                  ))}
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: 10,
                    background: `linear-gradient(180deg, color-mix(in srgb, ${shelfColor} 100%, white 30%) 0%, ${shelfColor} 50%, color-mix(in srgb, ${shelfColor} 60%, black) 100%)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Police */}
        <div className={isPremium ? "" : "opacity-60"}>
          <Label className="text-sm font-medium mb-3 block">
            Police du profil
            {!isPremium && <PremiumBadge />}
          </Label>
          <div className="flex gap-3 flex-wrap">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => isPremium && setFontFamily(f.value)}
                disabled={!isPremium}
                className={`px-4 py-2.5 rounded-lg border text-sm transition-colors flex items-center gap-2 ${
                  fontFamily === f.value
                    ? "border-violet-500 bg-violet-500/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-gray-400"
                } ${isPremium ? "hover:bg-white/5 cursor-pointer" : "cursor-not-allowed"}`}
                style={{ fontFamily: f.stack }}
              >
                {!isPremium && f.value !== "inter" && (
                  <Lock className="w-3 h-3 text-gray-500 shrink-0" />
                )}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Effets */}
        <div className={isPremium ? "" : "opacity-60"}>
          <Label className="text-sm font-medium mb-3 block">
            Effet visuel
            {!isPremium && <PremiumBadge />}
          </Label>
          <div className="flex gap-3 flex-wrap">
            {EFFECT_OPTIONS.map((e) => (
              <button
                key={e.label}
                onClick={() => isPremium && setEffect(e.value)}
                disabled={!isPremium}
                className={`flex-1 min-w-24 p-3 rounded-xl border text-left transition-colors ${
                  effect === e.value
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.02]"
                } ${isPremium ? "hover:bg-white/5 cursor-pointer" : "cursor-not-allowed"}`}
              >
                <p className="text-sm font-medium flex items-center justify-between gap-2">
                  {e.label}
                  {!isPremium && e.value !== null && (
                    <Lock className="w-3 h-3 text-gray-500 shrink-0" />
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{e.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {!isPremium && (
          <Link
            href="/dashboard/premium"
            className="flex items-center gap-2 p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 text-sm text-violet-300 hover:bg-violet-500/10 transition-colors"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            Débloque le fond GIF, la disposition, les polices et les effets avec Premium — 4,99 € à vie
          </Link>
        )}

        {saveError && <p className="text-sm text-red-400 -mb-4">{saveError}</p>}

        <Button
          onClick={save}
          disabled={saving}
          className="self-start bg-violet-600 hover:bg-violet-700 text-white px-10"
        >
          {saved ? "Sauvegardé ✓" : saving ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
      </div>
    </div>
  )
}
