import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { stripe, PREMIUM_PRICE_CENTS } from "@/lib/stripe"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, isPremium: true, stripeCustomerId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (user.isPremium) {
    return NextResponse.json({ error: "ALREADY_PREMIUM" }, { status: 400 })
  }

  // Réutilise le customer Stripe existant, sinon en crée un
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: session.user.id },
    })
    customerId = customer.id
    await db.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const origin = req.headers.get("origin") ?? process.env.AUTH_URL ?? "http://localhost:3000"

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: PREMIUM_PRICE_CENTS,
          product_data: {
            name: "ReadShelf Premium",
            description: "Paiement unique — accès Premium à vie",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: session.user.id },
    success_url: `${origin}/dashboard/premium?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/premium?status=cancelled`,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
