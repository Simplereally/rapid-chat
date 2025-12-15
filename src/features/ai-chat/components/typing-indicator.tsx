/**
 * Subtle typing indicator - a blinking cursor like ChatGPT/Claude
 */
export function TypingIndicator() {
  return (
    <span className="inline-flex items-center ml-0.5 align-text-bottom">
      <span className="inline-block w-[0.6em] h-[1.2rem] bg-current animate-blink" />
    </span>
  )
}
