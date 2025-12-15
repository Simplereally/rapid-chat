import type { UIMessage } from '@tanstack/ai-react'

/**
 * Extended message part with parsed thinking content.
 */
export interface ParsedTextPart {
  type: 'text'
  content: string
  parsedContent: string
  thinkingContent: string
  isThinking: boolean
}

export interface ParsedThinkingPart {
  type: 'thinking'
  content: string
}

export type ParsedPart = ParsedTextPart | ParsedThinkingPart | UIMessage['parts'][number]

/**
 * Message with parsed parts for rendering.
 */
export interface ParsedMessage extends Omit<UIMessage, 'parts'> {
  parsedParts: ParsedPart[]
  isStreamingAssistant: boolean
}
