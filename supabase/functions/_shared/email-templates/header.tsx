/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Hr, Section, Text } from 'npm:@react-email/components@0.0.22'

import { rule, wordmark, wordmarkSub } from './brand.ts'

export const BrandHeader = ({ siteName }: { siteName: string }) => (
  <Section>
    <Text style={wordmark}>{siteName}</Text>
    <Text style={wordmarkSub}>100-Year Preservation Plan</Text>
    <Hr style={rule} />
  </Section>
)

export default BrandHeader
