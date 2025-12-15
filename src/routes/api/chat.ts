import { createFileRoute } from '@tanstack/react-router'
import { chat, toStreamResponse } from '@tanstack/ai'
import { ollama } from '@tanstack/ai-ollama'
import { env } from '@/env'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = await request.json() as { messages: any[] }

        // Create an AbortController to propagate cancellation to Ollama
        const abortController = new AbortController()

        // Listen for client disconnect and abort the inference
        request.signal.addEventListener('abort', () => {
          abortController.abort()
        })

        const stream = chat({
          adapter: ollama({
            baseUrl: env.OLLAMA_BASE_URL,
          }),
          messages,
          model: env.OLLAMA_MODEL as any,
          abortController,
        })

        // Pass the abortController to toStreamResponse so it can clean up
        return toStreamResponse(stream, { abortController })
      },
    },
  },
})

