/**
 * Parsing utilities for AI chat messages.
 * Handles Ollama's <think>...</think> tags for reasoning output.
 */

export interface ParsedThinkingResult {
  thinking: string
  content: string
  isThinking: boolean
}

/**
 * Parse text content to extract and separate thinking content from the main response.
 * Handles Ollama's <think>...</think> tags for reasoning output.
 * Supports streaming content where tags might not be closed yet.
 * 
 * Edge cases handled:
 * - Empty <think></think> tags
 * - Whitespace-only thinking content
 * - Multiple think blocks
 * - Unclosed <think> tags during streaming
 */
export function parseThinkingContent(text: string): ParsedThinkingResult {
  // Quick check: if there's no <think> tag at all, return early
  if (!text.includes('<think>')) {
    return { thinking: '', content: text.trim(), isThinking: false }
  }

  // Check for open <think> tag that hasn't been closed
  const hasOpenThink = /<think>(?![\s\S]*<\/think>)/i.test(text)

  // Match complete <think>...</think> blocks or open <think>... at the end
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi
  const matches = text.match(thinkRegex)

  if (!matches) {
    return { thinking: '', content: text.trim(), isThinking: false }
  }

  // Extract thinking content, filtering out empty/whitespace-only blocks
  let thinking = ''
  for (const match of matches) {
    const innerContent = match.replace(/<\/?think>/gi, '').trim()
    if (innerContent) {
      thinking += (thinking ? '\n\n' : '') + innerContent
    }
  }

  // Remove ALL think-related content from main output, including the tags themselves
  // This ensures no <think> or </think> tags ever appear in the displayed content
  const content = text
    .replace(thinkRegex, '') // Remove complete and incomplete think blocks
    .replace(/<\/?think>/gi, '') // Remove any stray tags
    .trim()

  return { thinking, content, isThinking: hasOpenThink }
}

/**
 * Strip /think or /no_think prefix from user message content for display.
 */
export function stripThinkPrefix(content: string): string {
  return content.replace(/^\/think\s+/i, '').replace(/^\/no_think\s+/i, '')
}

/**
 * CSS for the blinking cursor animation.
 * Can be injected via a <style> tag or added to global styles.
 */
export const BLINK_ANIMATION_CSS = `
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.animate-blink {
  animation: blink 1s step-end infinite;
}
`
