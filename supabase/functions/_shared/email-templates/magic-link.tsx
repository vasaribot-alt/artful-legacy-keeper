/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { BrandHeader } from './header.tsx'
import { button, container, footer, h1, main, text } from './brand.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader siteName={siteName} />
        <Heading style={h1}>Your sign-in link</Heading>
        <Text style={text}>
          Use the link below to sign in to {siteName}. For your security it
          expires shortly and can only be used once.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Sign in
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
          <br />
          Global Artist Registry Foundation — permanent, verifiable documentation
          of artworks.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
