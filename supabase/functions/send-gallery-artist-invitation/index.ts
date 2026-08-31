// Sends the invitation email to an artist a gallery has just placed on its
// roster and who does not have a GARF account yet. One trigger, one recipient.
// The recipient is verified against the caller's own roster before sending.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const TEMPLATE_NAME = 'gallery-artist-invitation'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local[0]}***@${domain}`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Server configuration error' }, 500)
  }
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => null)
  const galleryId = typeof body?.galleryId === 'string' ? body.galleryId : ''
  const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : ''
  const artistName = typeof body?.artistName === 'string' ? body.artistName.trim() : ''
  const signupUrl = typeof body?.signupUrl === 'string' ? body.signupUrl : ''

  if (!galleryId || !recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return json({ error: 'galleryId and a valid recipientEmail are required' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // The caller must own the gallery, and the recipient must be on its roster
  // as an invited (non-GARF) artist. This keeps arbitrary recipients out.
  const { data: gallery, error: galleryError } = await admin
    .from('gallery_accounts')
    .select('id, name, owner_id')
    .eq('id', galleryId)
    .maybeSingle()

  if (galleryError) {
    console.error('Gallery lookup failed', { code: galleryError.code, message: galleryError.message })
    return json({ error: 'Could not verify gallery' }, 500)
  }
  if (!gallery || gallery.owner_id !== user.id) return json({ error: 'Forbidden' }, 403)

  const { data: representation, error: repError } = await admin
    .from('gallery_artist_representations')
    .select('id, invited_name, status')
    .eq('gallery_id', galleryId)
    .eq('invited_email', recipientEmail)
    .maybeSingle()

  if (repError) {
    console.error('Roster lookup failed', { code: repError.code, message: repError.message })
    return json({ error: 'Could not verify roster entry' }, 500)
  }
  if (!representation || representation.status !== 'invited') {
    return json({ error: 'No invited artist with that email on this roster' }, 404)
  }

  const templateData = {
    artistName: artistName || representation.invited_name || undefined,
    galleryName: gallery.name,
    signupUrl: signupUrl || 'https://globalartistregistry.org/register',
  }

  const logSend = async (
    status: 'sent' | 'suppressed' | 'failed',
    errorMessage?: string,
  ) => {
    const { error } = await admin.from('email_send_log').insert({
      template_name: TEMPLATE_NAME,
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage ?? null,
    })
    if (error) {
      console.error('Failed to write email_send_log', { code: error.code, message: error.message })
    }
  }

  try {
    const result = await sendTemplateEmail(TEMPLATE_NAME, recipientEmail, {
      templateData,
      idempotencyKey: `gallery-invite-${galleryId}-${recipientEmail.toLowerCase()}`,
    })

    if (!result.sent) {
      await logSend('suppressed')
      console.log('Invitation suppressed', { recipient_redacted: redactEmail(recipientEmail) })
      return json({ success: false, reason: 'recipient_suppressed' })
    }

    await logSend('sent')
    console.log('Invitation sent', { recipient_redacted: redactEmail(recipientEmail) })
    return json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send failed'
    await logSend('failed', message)
    console.error('Invitation send failed', { message })
    return json({ error: 'Failed to send invitation' }, 502)
  }
})
