import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * lemonsqueezy-webhook
 *
 * The ONLY thing that may grant or revoke a subscription.
 *
 * ⚠️ DEPLOY WITH JWT VERIFICATION **DISABLED** — Lemon Squeezy cannot send a Supabase JWT:
 *   supabase functions deploy lemonsqueezy-webhook --no-verify-jwt
 *
 * Security comes from HMAC-SHA256 signature verification against the webhook
 * signing secret, not from JWT.
 *
 * REQUIRED EDGE FUNCTION SECRETS:
 *   LEMONSQUEEZY_WEBHOOK_SECRET   the signing secret you set when creating the webhook
 *   SUPABASE_SERVICE_ROLE_KEY     provided automatically by Supabase
 *
 * Configure in Lemon Squeezy → Settings → Webhooks:
 *   URL:    https://<project-ref>.supabase.co/functions/v1/lemonsqueezy-webhook
 *   Events: subscription_created, subscription_updated, subscription_cancelled,
 *           subscription_resumed, subscription_expired, subscription_paused,
 *           subscription_unpaused, subscription_payment_success
 */

/** Map Lemon Squeezy subscription status onto our own enum. */
function mapStatus(ls: string): 'active' | 'past_due' | 'cancelled' | 'inactive' {
  switch (ls) {
    case 'active':
    case 'on_trial':
      return 'active'
    // Still paid up until `ends_at`; access is decided by current_period_end.
    case 'cancelled':
      return 'cancelled'
    case 'past_due':
      return 'past_due'
    case 'paused':
    case 'expired':
    case 'unpaid':
    default:
      return 'inactive'
  }
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmacSha256Hex(key: string, message: string) {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const signingSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')
    if (!signingSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not set')
      return new Response('Not configured', { status: 503 })
    }

    // Signature is computed over the EXACT raw bytes.
    const raw = await request.text()
    const signature = request.headers.get('X-Signature') || ''
    const expected = await hmacSha256Hex(signingSecret, raw)

    if (!signature || !safeEqual(signature.toLowerCase(), expected)) {
      console.warn('Rejected webhook: bad signature')
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(raw)
    const name: string = event?.meta?.event_name || ''
    const custom = event?.meta?.custom_data || {}
    const attrs = event?.data?.attributes || {}

    if (!name.startsWith('subscription')) {
      return new Response('ignored', { status: 200 })
    }

    const userId: string | undefined = custom.user_id
    if (!userId) {
      console.error('Webhook has no custom_data.user_id', name)
      return new Response('No user_id', { status: 200 })
    }

    const status = mapStatus(String(attrs.status || ''))
    const plan = String(custom.plan || attrs.variant_name || 'monthly').toLowerCase()

    // renews_at while active; ends_at once cancelled but still within the paid period.
    const periodEndRaw: string | null = attrs.renews_at || attrs.ends_at || null
    const periodEnd = periodEndRaw ? new Date(periodEndRaw).toISOString() : null

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { error } = await admin.from('subscriptions').upsert({
      user_id: userId,
      status,
      plan: plan === 'yearly' || plan === 'monthly' ? plan : 'monthly',
      provider: 'lemonsqueezy',
      provider_ref: String(event?.data?.id ?? ''),
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to write subscription', error)
      return new Response('Database error', { status: 500 })
    }

    console.log('Subscription', name, userId, status, periodEnd)
    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('lemonsqueezy-webhook error', error)
    return new Response('error', { status: 500 })
  }
})
