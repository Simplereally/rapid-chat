import { useState, useCallback } from 'react'
import { Bot, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'

interface ChatHeaderProps {
  hasMessages: boolean
  isLoading: boolean
  onClear: () => void
}

/**
 * Chat header with title and clear conversation button.
 * Uses a confirmation dialog before clearing the conversation.
 */
export function ChatHeader({ hasMessages, isLoading, onClear }: ChatHeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleConfirmClear = useCallback(() => {
    onClear()
    setIsDialogOpen(false)
  }, [onClear])

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">TanStack AI Test</h1>
        </div>

        {/* Clear conversation button with confirmation dialog */}
        {hasMessages && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Clear conversation</TooltipContent>
            </Tooltip>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear Conversation</DialogTitle>
                <DialogDescription>
                  Are you sure you want to clear this conversation? This action cannot be undone and all messages will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleConfirmClear}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Conversation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Separator className="mb-4" />
    </>
  )
}
