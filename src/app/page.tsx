"use client"

import { ChatSidebar } from "@/components/chat-sidebar"
import { useChatStore } from "@/store/chat-store"
import { useChatStream } from "@/hooks/use-chat-stream"
import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "@/components/message-bubble"
import { Menu, Send, Bot, User } from "lucide-react"

export default function Home() {
  const { isSidebarOpen, toggleSidebar } = useChatStore()
  const { messages, input, setInput, handleSubmit } = useChatStream()
  const mounted = useMounted()

  // Prevent hydration mismatch by defaulting to open (server state) until mounted
  const sidebarVisible = mounted ? isSidebarOpen : true

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300 ease-in-out shrink-0 border-r",
        sidebarVisible ? "w-[280px]" : "w-0 opacity-0 overflow-hidden"
      )}>
        <ChatSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative">
        <header className="flex items-center h-14 bg-background px-4 gap-4 shrink-0 absolute top-0 left-0 right-0 z-10">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(!sidebarVisible && "opacity-100", "transition-opacity")}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <span className="font-semibold text-lg opacity-90">GPT-4o</span>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-hidden relative flex flex-col pt-14">
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold">How can I help you today?</h2>
                </div>
              )}

              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} content={m.content} />
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 pb-6 bg-background">
            <div className="max-w-3xl mx-auto w-full relative">
              <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-muted/50 rounded-3xl border focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all shadow-sm">
                <Input
                  suppressHydrationWarning
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message ChatGPT..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-5 py-3.5 h-auto min-h-[52px] max-h-48 resize-none"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-full mb-0.5 transition-all disabled:opacity-20 hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <div className="text-xs text-center text-muted-foreground mt-2">
                Multi-AI Chat can make mistakes. Check important info.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
