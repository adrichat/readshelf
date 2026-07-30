import { Resend } from "resend"

export async function sendVerificationEmail(email: string, token: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const url = `${process.env.AUTH_URL}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Confirme ton adresse email — ReadShelf",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Bienvenue sur ReadShelf !</h2>
        <p>Clique sur le lien ci-dessous pour confirmer ton adresse email et activer ton compte.</p>
        <p><a href="${url}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Confirmer mon email</a></p>
        <p>Ce lien expire dans 24 heures. Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>
      </div>
    `,
  })
}

export async function sendAccountExistsEmail(email: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const loginUrl = `${process.env.AUTH_URL}/login`
  const forgotUrl = `${process.env.AUTH_URL}/forgot-password`

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Tentative de création de compte — ReadShelf",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Tu as déjà un compte</h2>
        <p>Quelqu'un a tenté de créer un compte ReadShelf avec cette adresse email, mais un compte existe déjà.</p>
        <p><a href="${loginUrl}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Se connecter</a></p>
        <p>Mot de passe oublié ? <a href="${forgotUrl}">Réinitialise-le ici</a>.</p>
        <p>Si ce n'est pas toi qui es à l'origine de cette tentative, ignore cet email.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const url = `${process.env.AUTH_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Réinitialise ton mot de passe — ReadShelf",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Clique sur le lien ci-dessous pour choisir un nouveau mot de passe.</p>
        <p><a href="${url}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe ne changera pas.</p>
      </div>
    `,
  })
}
