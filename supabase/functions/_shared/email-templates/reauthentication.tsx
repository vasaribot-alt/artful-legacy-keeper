/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { BrandHeader } from './header.tsx'
import { code, container, footer, h1, main, text } from './brand.ts'

interface ReauthenticationEmailProps {
  siteName?: string
  token: string
}

export const ReauthenticationEmail = ({
  siteName = 'Global Artist Registry Foundation',
  token,
}: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader siteName={siteName} />
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>
          Enter the verification code below to confirm your identity:
        </Text>
        <Text style={code}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely
          ignore this email.
          <br />
          Global Artist Registry Foundation
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
