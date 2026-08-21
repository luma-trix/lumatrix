import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * create-checkout — Lemon Squeezy
 *
 * Creates a hosted checkout for a Luma video subscription.
 *
 * DEPLOY WITH JWT VERIFICATION ENABLED:
 *   supabase functions deploy create-checkout
 *
 * REQUIRED EDGE FUNCTION SECRETS:
 *   LEMONSQUEEZY_API_KEY          from Settings → API
 *   LEMONSQUEEZY_STORE_ID         numeric store id
 *   LEMONSQUEEZY_VARIANT_MONTHLY  variant id of the monthly plan
 *   LEMONSQUEEZY_VARIANT_YEARLY   variant id of the yearly plan
 *   APP_URL                       e.g. https://luma-trix.github.io/
 *
 * NOTE ON PRICING: the amount charged is defined by the VARIANT in the Lemon
 * Squeezy dashboard, never by this code or the client. That makes tampering
 * impossible by construction — there is no amount to tamper with. Keep the
 * prices shown in src/Paywall.tsx in sync with the dashboard manually.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'Authentication required' }, 401)

    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')
    const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID')
    const variants: Record<string, string | undefined> = {
      monthly: Deno.env.get('LEMONSQUEEZY_VARIANT_MONTHLY'),
      yearly: Deno.env.get('LEMONSQUEEZY_VARIANT_YEARLY'),
    }

    if (!apiKey || !storeId) return json({ error: 'Payments are not configured' }, 503)

    const { plan } = await request.json().catch(() => ({ plan: null }))
    const variantId = variants[plan as string]
    if (!variantId) return json({ error: 'Unknown plan' }, 400)

    // Identify the caller from their Supabase JWT.
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
    )
    const { data: auth, error: authError } = await client.auth.getUser()
    if (authError || !auth.user) return json({ error: 'Invalid session' }, 401)

    const email = auth.user.email
    if (!email) return json({ error: 'Your account has no email address' }, 400)

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/?$/, '/')

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email,
              // Custom values MUST be strings. These come back on the webhook
              // as meta.custom_data and are how we know who paid.
              custom: { user_id: String(auth.user.id), plan: String(plan) },
            },
            product_options: {
              redirect_url: `${appUrl}?payment=complete`,
              enabled_variants: [Number(variantId)],
            },
            checkout_options: { embed: false, media: false },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(storeId) } },
            variant: { data: { type: 'variants', id: String(variantId) } },
          },
        },
      }),
    })

    const payload = await res.json().catch(() => null)
    const url = payload?.data?.attributes?.url

    if (!res.ok || !url) {
      console.error('Lemon Squeezy checkout failed', res.status, JSON.stringify(payload))
      return json({ error: 'Could not start checkout. Please try again.' }, 502)
    }

    return json({ authorization_url: url })
  } catch (error) {
    console.error('create-checkout error', error)
    return json({ error: 'Unexpected error' }, 500)
  }
})
