import { useState, useRef, useEffect } from 'react'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { TypingIndicator } from './typing-indicator'

interface ThinkingSectionProps {
  content: string
  isThinking: boolean
}

/**
 * Component to display collapsible thinking/reasoning content.
 * Uses Shadcn Collapsible for proper accessibility and animation.
 */
export function ThinkingSection({ content, isThinking }: ThinkingSectionProps) {
  const [isOpen, setIsOpen] = useState(isThinking)
  const prevThinkingRef = useRef(isThinking)

  // Handle transition from thinking -> done
  useEffect(() => {
    if (prevThinkingRef.current && !isThinking) {
      // Transitioning from thinking to done: Collapse automatically
      setIsOpen(false)
    } else if (!prevThinkingRef.current && isThinking) {
      // Transitioning from done/start to thinking: Expand automatically
      setIsOpen(true)
    }
    prevThinkingRef.current = isThinking
  }, [isThinking])

  if (!content && !isThinking) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Brain
            className={`h-3.5 w-3.5 transition-colors ${isThinking ? 'text-primary animate-pulse' : ''}`}
          />
          <span className="font-medium">
            {isThinking ? 'Thinking...' : 'Thoughts'}
          </span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="pl-2 border-l-2 border-primary/20 text-sm text-muted-foreground italic whitespace-pre-wrap py-2">
          {content}
          {isThinking && <TypingIndicator />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
