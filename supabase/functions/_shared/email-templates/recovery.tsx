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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader siteName={siteName} />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset the password for your {siteName}
          {' '}account. Choose a new password using the link below.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Set a new password
        </Button>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email — your
          password will remain unchanged.
          <br />
          Global Artist Registry Foundation — permanent, verifiable documentation
          of artworks.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
