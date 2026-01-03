"use client"

import { useState, useEffect, useCallback, useRef } from "react"

import { ChatSidebar } from "@/components/chat-sidebar"
import { useChatStore } from "@/store/chat-store"
import { useChatStream } from "@/hooks/use-chat-stream"
import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "@/components/message-bubble"
import { Menu, Send, Bot, User, RotateCcw, Square } from "lucide-react"
import { estimateTokens } from "@/lib/token-utils"
import { ResizableArtifactPanel } from "@/components/resizable-artifact-panel"

// ... imports

export default function Home() {
  const { isSidebarOpen, toggleSidebar, isArtifactOpen, isArtifactFullscreen } = useChatStore()
  const { messages, input, setInput, handleSubmit, handleRegenerate, handleEdit, isLoading, stop } = useChatStream()
  const mounted = useMounted()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset textarea height when input is cleared or sent
  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = '36px'
    }
  }, [input])

  // Prevent hydration mismatch by defaulting to open (server state) until mounted
  const sidebarVisible = mounted ? isSidebarOpen : true

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 font-sans">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/20 rounded-full blur-[100px] opacity-30" />
      </div>
      <div className="bg-noise" />

      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300 ease-in-out shrink-0 border-r",
        (sidebarVisible && !isArtifactFullscreen) ? "w-[280px]" : "w-0 opacity-0 overflow-hidden"
      )}>
        <ChatSidebar />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        {/* Chat Content */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative z-10">
          <header className={cn(
            "flex items-center h-14 bg-background px-4 gap-4 shrink-0 absolute top-0 left-0 right-0 z-10",
            isArtifactFullscreen && "hidden"
          )}>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(!sidebarVisible && "opacity-100", "transition-opacity")}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="font-semibold text-lg opacity-90">AAIOP</span>
            </div>
          </header>

          <main className="flex-1 overflow-hidden relative flex flex-col pt-14">
            <ScrollArea className="flex-1">
              <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-2">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                    <div className="bg-primary/10 p-4 rounded-full">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold">How can I help you today?</h2>
                  </div>
                )}

                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    id={m.id}
                    role={m.role}
                    content={m.content}
                    provider={m.provider}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 pb-6 bg-background">
              <div className="max-w-3xl mx-auto w-full relative">


                <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-muted/50 rounded-3xl border focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all shadow-sm pl-2">



                  <Textarea
                    ref={textareaRef}
                    suppressHydrationWarning
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${e.target.scrollHeight}px`
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e as any)
                      }
                    }}
                    placeholder="Message AAAOP..."
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pr-12 py-2 h-[36px] min-h-[36px] max-h-48 resize-none overflow-hidden scrollbar-hide text-sm"
                    autoFocus
                    rows={1}
                  />

                  {/* Token Counter */}
                  <div className={cn(
                    "absolute bottom-2 right-12 text-[10px] font-mono pointer-events-none transition-colors opacity-0 group-hover:opacity-100",
                    estimateTokens(input) > 2000 ? "text-red-500 font-bold" : "text-muted-foreground/60"
                  )}>
                    {input.length > 0 && `${estimateTokens(input)} tokens`}
                  </div>

                  {isLoading ? (
                    <Button
                      type="button"
                      size="icon"
                      onClick={stop}
                      className="absolute right-1 bottom-[2px] h-8 w-8 rounded-full transition-all hover:scale-105 active:scale-95 z-10 bg-red-500 hover:bg-red-600 animate-pulse"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim()}
                      className="absolute right-1 bottom-[2px] h-8 w-8 rounded-full transition-all disabled:opacity-20 hover:scale-105 active:scale-95 z-10"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </form>

                {/* Regenerate Button Helper */}
                {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                  <div className="absolute -top-12 right-0 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                      className="text-xs flex items-center gap-1 h-8 bg-background/80 backdrop-blur"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Regenerate
                    </Button>
                  </div>
                )}

                <div className="text-center text-xs text-muted-foreground/50 py-2">
                  AAAOP can make mistakes. Consider checking important information.
                </div>
              </div>
            </div>
          </main>
        </div>

        <ResizableArtifactPanel isArtifactOpen={isArtifactOpen} />
      </div>
    </div>
  );
}
