// Server-only helper for feature senders that compose their own HTML at send
// time (outreach letters, internal notifications). Sends through Lovable's
// managed email API — delivery, retries, suppression and unsubscribe handling
// happen on Lovable's side. Never import this from browser code.

import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'

const SENDER_DOMAIN = 'notify.globalartistregistry.org'
const FROM_DOMAIN = 'notify.globalartistregistry.org'

export type SendRawEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendRawEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  /** Label used in the delivery logs, e.g. "gallery_outreach". */
  label: string
  /** Dedupes retries of the same logical send. */
  idempotencyKey?: string
  replyTo?: string
  /** Display name in the From header. Defaults to the Foundation. */
  fromName?: string
  /** Local part of the From address. Defaults to "noreply". */
  fromLocalPart?: string
}

/** The email API requires a plain-text part; derive one when a caller only sends HTML. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export async function sendRawEmail(input: SendRawEmailInput): Promise<SendRawEmailResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured')

  const fromName = input.fromName || 'Global Artist Registry Foundation'
  const localPart = input.fromLocalPart || 'noreply'
  const text = input.text?.trim() || htmlToText(input.html) || input.subject


  try {
    await sendLovableEmail(
      {
        to: input.to,
        from: `${fromName} <${localPart}@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: input.subject,
        html: input.html,
        text,
        purpose: 'transactional',
        label: input.label,
        idempotency_key: input.idempotencyKey || crypto.randomUUID(),
        reply_to: input.replyTo,
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      return { sent: false, reason: 'recipient_suppressed' }
    }
    throw error
  }

  return { sent: true }
}
