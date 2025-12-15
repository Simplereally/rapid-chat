import { createFileRoute } from '@tanstack/react-router'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { useState, useMemo, useRef, useLayoutEffect, useCallback } from 'react'
import { Bot } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChatHeader,
  ChatInputForm,
  ChatMessage,
  useMessageActions,
  parseThinkingContent,
  BLINK_ANIMATION_CSS,
  type ParsedMessage,
  type ParsedPart,
} from '@/features/ai-chat'

export const Route = createFileRoute('/test/ai')({
  component: AIChatTest,
})

function AIChatTest() {
  const [input, setInput] = useState('')
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(true)
  const scrollViewportRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, isLoading, setMessages, stop } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

  const {
    editingMessageId,
    editContent,
    setEditContent,
    startEditing,
    cancelEditing,
    submitEdit,
    copiedMessageId,
    copyToClipboard,
    clearConversation,
    regenerateResponse,
    getDisplayContent,
  } = useMessageActions({
    messages,
    setMessages,
    sendMessage,
    isLoading,
    isThinkingEnabled,
  })

  // Extract last message content for granular scroll triggers during streaming
  const lastMessageContent = useMemo(() => {
    if (messages.length === 0) return ''
    const lastMsg = messages[messages.length - 1]
    return lastMsg.parts
      .filter((p): p is { type: 'text'; content: string } => p.type === 'text')
      .map((p) => p.content)
      .join('')
  }, [messages])

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive or content streams in
  // Using useLayoutEffect for more immediate scroll updates during streaming
  useLayoutEffect(() => {
    scrollToBottom()
  }, [messages.length, lastMessageContent, isLoading, scrollToBottom])

  // Parse messages to extract thinking content - memoized for performance
  const parsedMessages: ParsedMessage[] = useMemo(() => {
    return messages.map((message, messageIndex) => {
      const isLastMessage = messageIndex === messages.length - 1
      const isStreamingAssistant =
        isLoading && message.role === 'assistant' && isLastMessage

      if (message.role !== 'assistant') {
        return {
          ...message,
          parsedParts: message.parts as ParsedPart[],
          isStreamingAssistant: false,
        }
      }

      // Parse assistant messages to separate thinking from content
      const parsedParts: ParsedPart[] = message.parts.map((part) => {
        if (part.type === 'text') {
          const { thinking, content, isThinking } = parseThinkingContent(
            part.content
          )
          const currentlyThinking = isStreamingAssistant && isThinking
          return {
            ...part,
            parsedContent: content,
            thinkingContent: thinking,
            isThinking: currentlyThinking,
          }
        }
        return part
      })

      return { ...message, parsedParts, isStreamingAssistant }
    })
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      const thinkPrefix = isThinkingEnabled ? '/think ' : '/no_think '
      sendMessage(thinkPrefix + input)
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto p-4">
      {/* Inject blink animation CSS */}
      <style>{BLINK_ANIMATION_CSS}</style>

      <ChatHeader
        hasMessages={messages.length > 0}
        isLoading={isLoading}
        onClear={clearConversation}
      />

      {/* Messages area - scrollable region */}
      <ScrollArea className="flex-1 min-h-0 pr-4" ref={scrollViewportRef}>
        <div className="space-y-4 pb-4">
          {parsedMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground opacity-50">
              <Bot className="h-12 w-12 mb-2" />
              <p>Start a conversation...</p>
            </div>
          )}

          {parsedMessages.map((message) => {
            const displayContent = getDisplayContent(message)

            return (
              <ChatMessage
                key={message.id}
                message={message}
                isBeingEdited={editingMessageId === message.id}
                isDimmed={editingMessageId !== null && editingMessageId !== message.id}
                isCopied={copiedMessageId === message.id}
                editContent={editContent}
                isLoading={isLoading}
                onCopy={() => copyToClipboard(message.id, displayContent)}
                onEdit={() => startEditing(message.id, displayContent)}
                onRegenerate={() => regenerateResponse(message.id)}
                onEditContentChange={setEditContent}
                onEditSubmit={submitEdit}
                onEditCancel={cancelEditing}
                hasActiveEdit={editingMessageId !== null}
              />
            )
          })}
        </div>
      </ScrollArea>

      {/* Input area - fixed at bottom, outside scroll region */}
      <div className="shrink-0 border-t border-border bg-background pt-2">
        <ChatInputForm
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onStop={stop}
          isLoading={isLoading}
          isThinkingEnabled={isThinkingEnabled}
          onThinkingToggle={() => setIsThinkingEnabled(!isThinkingEnabled)}
        />
      </div>
    </div>
  )
}

