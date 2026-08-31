import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Notification-only: mirrors bounce / complaint / unsubscribe outcomes into the
// project's own records so the Foundation's email log and supporter lists stay
// accurate. Lovable enforces suppression at send time — these rows never gate
// a send.

const REASON_MESSAGES: Record<string, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

const LOG_STATUS: Record<string, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

async function recordOutcome(
  reason: 'bounce' | 'complaint' | 'unsubscribe',
  recipient: string,
  messageId: string | null,
  eventId: string,
) {
  const supabase = admin()
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: eventId,
    })
    throw new Error('Failed to record suppression')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: messageId ?? null,
    template_name: 'system',
    recipient_email: email,
    status: LOG_STATUS[reason],
    error_message: REASON_MESSAGES[reason],
    metadata: null,
  })

  if (logError) {
    console.error('Failed to insert email_send_log', {
      code: logError.code,
      message: logError.message,
      event_id: eventId,
    })
    throw new Error('Failed to record send log entry')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordOutcome('bounce', event.data.recipient, event.data.message_id ?? null, event.event_id)
    },
    'email.complaint': async (event) => {
      await recordOutcome('complaint', event.data.recipient, event.data.message_id ?? null, event.event_id)
    },
    'email.unsubscribed': async (event) => {
      await recordOutcome('unsubscribe', event.data.recipient, event.data.message_id ?? null, event.event_id)
    },
  },
})

Deno.serve((req) => handler(req))
