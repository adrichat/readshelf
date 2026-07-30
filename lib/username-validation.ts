// Règles de format et de mots réservés pour les usernames — centralisées ici
// car un des points d'entrée (l'étape post-OAuth, /api/auth/setup) doit
// appliquer exactement les mêmes règles que /api/auth/set-username et
// /api/auth/register, sinon un compte peut se retrouver avec un username qui
// contourne ces contraintes.

export const USERNAME_RE = /^[a-z0-9_-]{3,30}$/

// Toute route statique de premier niveau doit apparaître ici, sinon un compte
// qui obtiendrait ce username aurait un profil public définitivement
// inaccessible (la route statique est prioritaire sur `/[username]`).
export const RESERVED_USERNAMES = [
  "api",
  "login",
  "register",
  "dashboard",
  "admin",
  "demo",
  "setup",
  "forgot-password",
  "reset-password",
  "cgu-cgv",
  "confidentialite",
  "mentions-legales",
  "404",
  "500",
]

export function isValidUsername(username: unknown): username is string {
  return (
    typeof username === "string" &&
    USERNAME_RE.test(username) &&
    !RESERVED_USERNAMES.includes(username)
  )
}
