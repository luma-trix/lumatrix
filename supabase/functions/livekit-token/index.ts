import { createClient } from 'npm:@supabase/supabase-js@2'
import { AccessToken } from 'npm:livekit-server-sdk@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return response({ error: 'Authentication required' }, 401)
    const { roomId } = await request.json()
    if (!roomId) return response({ error: 'roomId is required' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const livekitUrl = Deno.env.get('LIVEKIT_URL')
    const apiKey = Deno.env.get('LIVEKIT_API_KEY')
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
    if (!livekitUrl || !apiKey || !apiSecret) return response({ error: 'LiveKit server secrets are not configured' }, 503)

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: authData, error: authError } = await client.auth.getUser()
    if (authError || !authData.user) return response({ error: 'Invalid session' }, 401)

    const [{ data: invitation }, { data: profile }, { data: room }] = await Promise.all([
      client.from('conference_participants').select('room_id').eq('room_id', roomId).eq('user_id', authData.user.id).maybeSingle(),
      client.from('profiles').select('display_name').eq('id', authData.user.id).single(),
      client.from('conference_rooms').select('id,room_code,active,expires_at').eq('id', roomId).maybeSingle(),
    ])
    if (!invitation || !room || !room.active || new Date(room.expires_at) <= new Date()) return response({ error: 'Conference invitation is invalid or expired' }, 403)

    const token = new AccessToken(apiKey, apiSecret, {
      identity: authData.user.id,
      name: profile?.display_name || 'Luma member',
      ttl: '2h',
    })
    token.addGrant({
      room: room.room_code,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    return response({ url: livekitUrl, token: await token.toJwt() }, 200)
  } catch (error) {
    console.error(error)
    return response({ error: error instanceof Error ? error.message : 'Token generation failed' }, 500)
  }
})

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
