import { Send, Brain, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface ChatInputFormProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onStop: () => void
  isLoading: boolean
  isThinkingEnabled: boolean
  onThinkingToggle: () => void
}

/**
 * Chat input form with thinking toggle and send button.
 */
export function ChatInputForm({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isLoading,
  isThinkingEnabled,
  onThinkingToggle,
}: ChatInputFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex gap-2 items-end pb-2"
    >
      {/* Thinking Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isThinkingEnabled ? 'outline' : 'ghost'}
            size="icon"
            onClick={onThinkingToggle}
            className={
              isThinkingEnabled
                ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20'
                : ''
            }
          >
            <Brain className="h-4 w-4" />
            <span className="sr-only">
              {isThinkingEnabled ? 'Disable thinking' : 'Enable thinking'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isThinkingEnabled ? 'Thinking enabled' : 'Thinking disabled'}
        </TooltipContent>
      </Tooltip>

      <Input
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Ask something..."
        className="flex-1"
        disabled={isLoading}
      />

      {isLoading ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={onStop}
            >
              <Square className="h-4 w-4" />
              <span className="sr-only">Stop</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop generating</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send message</TooltipContent>
        </Tooltip>
      )}
    </form>
  )
}
