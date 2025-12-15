import { useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'

interface EditMessageFormProps {
  editContent: string
  onEditContentChange: (content: string) => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitDisabled: boolean
  isUserMessage: boolean
}

/**
 * Inline form for editing a message.
 * Appears inside the message bubble when editing.
 */
export function EditMessageForm({
  editContent,
  onEditContentChange,
  onSubmit,
  onCancel,
  isSubmitDisabled,
  isUserMessage,
}: EditMessageFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus and move cursor to end when mounted
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="min-w-[200px]">
      <Textarea
        ref={textareaRef}
        value={editContent}
        onChange={(e) => onEditContentChange(e.target.value)}
        className={`min-h-[60px] bg-transparent border-none shadow-none resize-none ${
          isUserMessage
            ? 'text-primary-foreground placeholder:text-primary-foreground/50'
            : 'text-foreground'
        }`}
        placeholder="Edit your message..."
        onKeyDown={handleKeyDown}
      />
      <Separator
        className={`my-2 ${isUserMessage ? 'bg-primary-foreground/20' : ''}`}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className={`h-7 px-2 ${
            isUserMessage
              ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
              : ''
          }`}
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
        <Button
          variant={isUserMessage ? 'secondary' : 'default'}
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className={`h-7 px-2 ${
            isUserMessage
              ? 'bg-white/20 text-primary-foreground hover:bg-white/30'
              : ''
          }`}
        >
          <Check className="h-3 w-3" />
          Send
        </Button>
      </div>
    </div>
  )
}
