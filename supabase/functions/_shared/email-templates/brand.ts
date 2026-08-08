// Shared brand styling for GARF auth emails.
// Monochrome, archival, serif headings + sans body — mirrors the app design system.

export const SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif"
export const SANS = "'DM Sans', Helvetica, Arial, sans-serif"

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: SANS,
  margin: '0',
  padding: '0',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 32px 48px',
}

export const wordmark = {
  fontFamily: SERIF,
  fontSize: '18px',
  color: '#0a0a0a',
  letterSpacing: '0.01em',
  margin: '0 0 4px',
}

export const wordmarkSub = {
  fontFamily: SANS,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.14em',
  color: '#737373',
  margin: '0',
}

export const rule = {
  borderColor: '#e5e5e5',
  borderTopWidth: '1px',
  margin: '24px 0 32px',
}

export const h1 = {
  fontFamily: SERIF,
  fontSize: '26px',
  fontWeight: 400 as const,
  lineHeight: '1.25',
  letterSpacing: '-0.01em',
  color: '#0a0a0a',
  margin: '0 0 18px',
}

export const text = {
  fontFamily: SANS,
  fontSize: '15px',
  color: '#404040',
  lineHeight: '1.65',
  margin: '0 0 20px',
}

export const link = { color: '#0a0a0a', textDecoration: 'underline' }

export const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontFamily: SANS,
  fontSize: '14px',
  fontWeight: 500 as const,
  letterSpacing: '0.02em',
  borderRadius: '4px',
  padding: '13px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const code = {
  fontFamily: "'DM Mono', Menlo, Courier, monospace",
  fontSize: '26px',
  fontWeight: 500 as const,
  letterSpacing: '0.22em',
  color: '#0a0a0a',
  backgroundColor: '#f5f5f5',
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '16px 20px',
  textAlign: 'center' as const,
  margin: '0 0 28px',
}

export const footer = {
  fontFamily: SANS,
  fontSize: '12px',
  color: '#8a8a8a',
  lineHeight: '1.6',
  margin: '36px 0 0',
}
