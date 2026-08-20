import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'You must be signed in' }, 401)

    const { confirmation } = await request.json()
    if (confirmation !== 'DELETE') return json({ error: 'Type DELETE to confirm permanent deletion' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // This client keeps the caller's identity, so auth.uid() inside the RPC
    // is always the account being deleted.
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Invalid or expired session' }, 401)
    const user = userData.user

    // The service-role client stays inside the server-side Edge Function.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    // Capture conversation paths before membership is removed by the Auth cascade.
    const { data: memberships, error: membershipError } = await userClient
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)
    if (membershipError) throw membershipError

    // Remove all account-owned objects through the supported Storage API.
    await removeFolder(admin, 'profile-media', user.id)
    await removeFolder(admin, 'status-media', user.id)
    for (const membership of memberships ?? []) {
      await removeFolder(admin, 'chat-media', `${membership.conversation_id}/${user.id}`)
    }

    // Transfer group ownership and remove empty conversations.
    const { error: prepareError } = await userClient.rpc('prepare_my_account_deletion', {
      confirmation: 'DELETE',
    })
    if (prepareError) throw prepareError

    // Permanently remove the Auth account. Foreign-key cascades erase profile,
    // memberships, messages, calls, Moments, votes, reactions, and saved items.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false)
    if (deleteError) throw deleteError

    return json({ deleted: true }, 200)
  } catch (error) {
    console.error('delete-account failed', error)
    return json({ error: error instanceof Error ? error.message : 'Account deletion failed' }, 500)
  }
})

async function removeFolder(admin: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  // Folders are virtual. Keep listing from offset zero because removing files
  // shifts the remaining page. Recursively process any nested folders.
  for (let pass = 0; pass < 100; pass++) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      // A missing optional bucket/folder means there is simply nothing to erase.
      if (/not found|does not exist/i.test(error.message)) return
      throw error
    }
    if (!data?.length) return

    const files = data.filter((item) => Boolean(item.id)).map((item) => `${prefix}/${item.name}`)
    const folders = data.filter((item) => !item.id)
    if (files.length) {
      const { error: removeError } = await admin.storage.from(bucket).remove(files)
      if (removeError) throw removeError
    }
    for (const folder of folders) await removeFolder(admin, bucket, `${prefix}/${folder.name}`)
    if (data.length < 100 && !files.length) return
  }
  throw new Error(`Could not finish removing ${bucket}/${prefix}`)
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
