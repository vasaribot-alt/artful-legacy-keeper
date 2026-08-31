/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { BrandHeader } from './header.tsx'
import { button, container, footer, h1, link, main, text } from './brand.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader siteName={siteName} />
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You have been invited to join{' '}
          <Link href={siteUrl} style={link}>
            {siteName}
          </Link>
          {' '}— the registry for permanent, verifiable documentation of
          artworks. Accept the invitation to create your account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
          <br />
          Global Artist Registry Foundation
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
