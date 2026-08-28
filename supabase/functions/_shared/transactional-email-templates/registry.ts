import type * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  // deno-lint-ignore no-explicit-any
  component: React.ComponentType<any>
  // deno-lint-ignore no-explicit-any
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  // deno-lint-ignore no-explicit-any
  previewData?: Record<string, any>
  to?: string
}

import { template as galleryArtistInvitation } from './gallery-artist-invitation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'gallery-artist-invitation': galleryArtistInvitation,
}
