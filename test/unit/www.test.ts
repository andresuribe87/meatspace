import { describe, expect, it } from 'vitest'

import { apexUrl } from '../../www/redirect'

describe('www redirect', () => {
  it.each([
    ['https://www.meatspace.sh/', 'https://meatspace.sh/'],
    ['https://www.meatspace.sh/docs', 'https://meatspace.sh/docs'],
    ['https://www.meatspace.sh/docs?format=txt', 'https://meatspace.sh/docs?format=txt'],
    ['https://www.meatspace.sh/install.sh', 'https://meatspace.sh/install.sh'],
    ['http://www.meatspace.sh/v1/nodes?x=1&y=2', 'https://meatspace.sh/v1/nodes?x=1&y=2'],
  ])('%s -> %s', (from, to) => {
    expect(apexUrl(from)).toBe(to)
  })

  it('drops the fragment and never redirects off the apex', () => {
    expect(apexUrl('https://www.meatspace.sh//evil.example/x#frag')).toBe('https://meatspace.sh//evil.example/x')
    expect(new URL(apexUrl('https://www.meatspace.sh//evil.example/x')).host).toBe('meatspace.sh')
  })
})
