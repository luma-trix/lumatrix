import { useState } from 'react'
import { LumaMark } from './Brand'
import { Check, LockKeyhole, ShieldCheck, Video, X } from './icons'
import { supabase } from './lib/supabase'

/**
 * Subscription gate for 1:1 video calls.
 *
 * IMPORTANT — this component deliberately collects NO card details.
 * Card number / expiry / CVV must never be typed into this app: that would put
 * Luma in PCI-DSS scope, and the site is statically hosted with no secure
 * server to receive them. Instead we hand off to a payment-provider-hosted
 * checkout page, and the provider returns an opaque reference which a
 * service-role Edge Function verifies before writing `subscriptions.status`.
 *
 * Wiring a real provider:
 *   1. Deploy an Edge Function `create-checkout` that calls the provider's
 *      "initialise transaction" API with your SECRET key (Edge Function secret,
 *      never in this bundle) and returns { authorization_url }.
 *   2. Deploy `verify-subscription` to handle the provider webhook, verify the
 *      signature, and upsert the row in `public.subscriptions`.
 *   3. Run `supabase/v19_subscriptions.sql`.
 */

export type Plan = 'monthly' | 'yearly'

// Display only. The amount actually charged is defined by the Lemon Squeezy
// variant in your dashboard — keep these two in sync by hand.
const PLANS: { id: Plan; name: string; price: string; period: string; note?: string }[] = [
  { id: 'monthly', name: 'Monthly', price: '$2.99', period: 'per month' },
  { id: 'yearly', name: 'Yearly', price: '$24', period: 'per year', note: 'Save 33%' },
]

const PERKS = [
  'Unlimited one-to-one video calls',
  'HD video with adaptive quality',
  'Camera switching and screen sharing',
  'Priority connection routing',
  'Pay in your local currency',
]

export default function Paywall({ onClose, onNotice }: { onClose: () => void; onNotice: (m: string) => void }) {
  const [plan, setPlan] = useState<Plan>('monthly')
  const [busy, setBusy] = useState(false)

  async function startCheckout() {
    setBusy(true)
    try {
      // Hands off to a provider-hosted checkout. Until `create-checkout` is
      // deployed this returns an error, which we surface honestly rather than
      // pretending a payment succeeded.
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { plan } })
      const url = (data as { authorization_url?: string } | null)?.authorization_url
      if (error || !url) {
        onNotice('Payments are not set up yet. No charge was made and no card details were collected.')
        return
      }
      window.location.href = url
    } catch {
      onNotice('Could not reach the payment service. Please try again later.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rt-modal-backdrop" onClick={onClose}>
      <div className="paywall" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Subscribe to use video calls">
        <button className="paywall-close" onClick={onClose} aria-label="Close"><X /></button>

        <div className="paywall-head">
          <LumaMark />
          <span className="paywall-badge"><Video /> Video calling</span>
          <h2>Upgrade to keep the camera on</h2>
          <p>Voice calls and group conferences stay free. A subscription unlocks one-to-one video.</p>
        </div>

        <ul className="paywall-perks">
          {PERKS.map(p => <li key={p}><Check /> {p}</li>)}
        </ul>

        <div className="paywall-plans">
          {PLANS.map(p => (
            <button
              key={p.id}
              className={`paywall-plan ${plan === p.id ? 'active' : ''}`}
              onClick={() => setPlan(p.id)}
              aria-pressed={plan === p.id}
            >
              {p.note && <em>{p.note}</em>}
              <strong>{p.name}</strong>
              <b>{p.price}</b>
              <small>{p.period}</small>
            </button>
          ))}
        </div>

        <button className="paywall-cta" onClick={() => void startCheckout()} disabled={busy}>
          {busy ? 'Opening secure checkout…' : 'Continue to secure checkout'}
        </button>

        <p className="paywall-secure">
          <ShieldCheck /> Payment is completed on Lemon Squeezy&apos;s secure checkout,
          which supports cards worldwide. Luma never sees or stores your card details.
          Taxes are calculated automatically for your country.
        </p>
        <p className="paywall-legal">
          <LockKeyhole /> Cancel anytime. Voice calls, messaging, Moments and group
          conferences remain free.
        </p>
      </div>
    </div>
  )
}
