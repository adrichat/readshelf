// Limiteur de débit en mémoire, fenêtre fixe par clé (IP, email, user id…).
// Suffisant pour freiner les abus évidents sur une bêta à faible trafic —
// la mémoire n'est pas partagée entre instances serverless, donc la limite
// s'applique par instance et non globalement. À remplacer par un store
// partagé (Upstash/Redis) si le trafic ou le nombre d'instances augmente.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const CLEANUP_INTERVAL_MS = 10 * 60_000
let lastCleanup = Date.now()

function cleanupExpired(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** true si la requête est autorisée, false si la limite est dépassée pour cette clé */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  cleanupExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

/** IP client à partir des en-têtes de proxy (Vercel les pose systématiquement) */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
