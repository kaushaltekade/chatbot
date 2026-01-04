"use client"

import { useChatStore } from "@/store/chat-store"
import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, Columns, X } from "lucide-react"
import { ResizableArtifactPanel } from "@/components/resizable-artifact-panel"
import { AnimatedTitle } from "@/components/animated-title"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatPane } from "@/components/chat-pane"

export default function Home() {
  const {
    isSidebarOpen,
    toggleSidebar,
    isArtifactOpen,
    isArtifactFullscreen,
    splitViewMode,
    setSplitViewMode,
    activeConversationId,
    secondaryConversationId,
    activePane,
    setActivePane,
    conversations
  } = useChatStore()

  const mounted = useMounted()

  // Calculate total messages for Unlock Feature
  // Only show toggle after 20 messages sent
  const totalMessagesSent = conversations.reduce((acc, c) => acc + c.messages.filter(m => m.role === 'user').length, 0)
  const isSplitViewUnlocked = totalMessagesSent >= 20

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
        {/* Chat Content Panel */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative z-10">
          <header className={cn(
            "flex items-center h-14 bg-background px-4 gap-4 shrink-0 border-b z-20 sticky top-0",
            isArtifactFullscreen && "hidden"
          )}>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(!sidebarVisible && "opacity-100", "transition-opacity")}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <AnimatedTitle />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {isSplitViewUnlocked && (
                <Button
                  variant={splitViewMode ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSplitViewMode(!splitViewMode)}
                  className="gap-2 hidden md:flex"
                  title={splitViewMode ? "Close Split View" : "Open Split View (Arena)"}
                >
                  {splitViewMode ? <X className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
                  <span className="sr-only">{splitViewMode ? "Exit Split View" : "Split View"}</span>
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-hidden relative flex">
            {/* Primary Pane */}
            <ChatPane
              className="flex-1 border-r"
              conversationId={activeConversationId}
              isActive={!splitViewMode || activePane === 'primary'}
              onFocus={() => setActivePane('primary')}
            />

            {/* Secondary Pane (Split View) */}
            {splitViewMode && (
              <ChatPane
                className="flex-1 animate-in slide-in-from-right-5 duration-300"
                conversationId={secondaryConversationId}
                isActive={activePane === 'secondary'}
                onFocus={() => setActivePane('secondary')}
              />
            )}
          </main>
        </div>

        <ResizableArtifactPanel isArtifactOpen={isArtifactOpen} />
      </div>
    </div>
  );
}
