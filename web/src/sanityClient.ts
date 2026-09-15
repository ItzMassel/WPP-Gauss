import {createClient} from '@sanity/client'

export const client = createClient({
  projectId: '59zxvwfo',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2025-01-01',
})
