import type { ModelMessage } from 'ai'

const messages1: ModelMessage[] = [
  {
    role: 'user',
    content: 'Hello',
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' }
      }
    }
  }
]

const messages2: ModelMessage[] = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Hello',
        providerOptions: {
          anthropic: {
            cacheControl: { type: 'ephemeral' }
          }
        }
      }
    ]
  }
]

console.log('Compiled successfully!', { messages1, messages2 })
