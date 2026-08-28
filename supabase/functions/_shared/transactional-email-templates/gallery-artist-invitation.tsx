import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  main,
  container,
  wordmark,
  wordmarkSub,
  rule,
  h1,
  text,
  link,
  button,
  footer,
  SANS,
} from '../email-templates/brand.ts'

interface Props {
  artistName?: string
  galleryName?: string
  signupUrl?: string
}

const listItem = { ...text, margin: '0 0 10px' }
const label = {
  fontFamily: SANS,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.14em',
  color: '#737373',
  margin: '0 0 12px',
}

const Email = ({
  artistName,
  galleryName = 'A gallery you work with',
  signupUrl = 'https://globalartistregistry.org/register',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{galleryName} has joined the Global Artist Registry Foundation</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>Global Artist Registry Foundation</Text>
        <Text style={wordmarkSub}>100-Year Preservation Plan</Text>
        <Hr style={rule} />

        <Heading style={h1}>{galleryName} has joined GARF</Heading>

        <Text style={text}>
          {artistName ? `Dear ${artistName},` : 'Dear artist,'}
        </Text>

        <Text style={text}>
          {galleryName} has created an account with the Global Artist Registry Foundation and
          has listed you on their roster of represented artists. The foundation is a Dutch
          stichting, a not for profit, established to document and preserve the work of living
          artists for at least one hundred years.
        </Text>

        <Text style={text}>
          We would like to invite you to create your own artist account. Registration is free
          for life for every ID verified artist, and your records are kept in accordance with
          the foundation's 100-Year Preservation Plan.
        </Text>

        <Section style={{ margin: '0 0 28px' }}>
          <Text style={label}>What your account gives you</Text>
          <Text style={listItem}>
            Your own catalogue of works, with images, dimensions, media, editions and
            provenance, held under your control rather than a gallery's system.
          </Text>
          <Text style={listItem}>
            A permanent artist identifier and a permanent identifier for every work, so your
            works stay traceable through sales, loans and future ownership.
          </Text>
          <Text style={listItem}>
            Exhibition history, catalogues and CV in one archive, with the option to import
            what already exists on gallery and museum websites.
          </Text>
          <Text style={listItem}>
            A public artist page you decide the content of, and private portfolios you can
            share by link with galleries, collectors and institutions.
          </Text>
          <Text style={listItem}>
            Verification of records added on your behalf. Nothing a gallery or registrar
            enters about your work becomes part of your verified archive without your
            approval.
          </Text>
          <Text style={listItem}>
            Cloud storage for high resolution photography and documentation, and a
            correspondence archive for the written record around your practice.
          </Text>
        </Section>

        <Section style={{ margin: '0 0 28px' }}>
          <Button href={signupUrl} style={button}>
            Create your free artist account
          </Button>
        </Section>

        <Text style={text}>
          If you sign up with this email address, the request from {galleryName} appears in
          your account so you can approve or decline the representation listing.
        </Text>

        <Text style={text}>
          Questions are welcome. You can read more at{' '}
          <Link href="https://globalartistregistry.org" style={link}>
            globalartistregistry.org
          </Link>{' '}
          or reply to this message.
        </Text>

        <Text style={footer}>
          Global Artist Registry Foundation, Stichting registered in the Netherlands.
          You received this message because a gallery listed you as a represented artist.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `${(data?.galleryName as string) || 'Your gallery'} has joined GARF, your free artist archive awaits`,
  displayName: 'Gallery artist invitation',
  previewData: {
    artistName: 'Fredrik Værslev',
    galleryName: 'Andrew Kreps Gallery',
    signupUrl: 'https://globalartistregistry.org/register',
  },
} satisfies TemplateEntry
