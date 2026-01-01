"use client"

import * as React from "react"
import { useChatStore } from "@/store/chat-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MessageSquarePlus, Settings, History } from "lucide-react"
import Link from "next/link"
import { AuthButtons } from "@/components/auth/auth-buttons"

export function ChatSidebar() {
    const { isSidebarOpen } = useChatStore()

    // if (!isSidebarOpen) return null

    return (
        <div className="w-[280px] h-screen bg-muted/20 border-r flex flex-col">
            <div className="p-4 border-b">
                <Button variant="outline" className="w-full justify-start gap-2">
                    <MessageSquarePlus className="w-4 h-4" />
                    New Chat
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Recent</h3>
                    {/* Mock History Items */}
                    <Button variant="ghost" className="justify-start text-sm truncate h-auto py-2">
                        <History className="w-4 h-4 mr-2 shrink-0" />
                        Previous Conversation 1
                    </Button>
                    <Button variant="ghost" className="justify-start text-sm truncate h-auto py-2">
                        <History className="w-4 h-4 mr-2 shrink-0" />
                        Project Planning
                    </Button>
                </div>
            </ScrollArea>

            <div className="p-4 border-t space-y-2">
                <AuthButtons />
                <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                </Link>
            </div>        </div>
    )
}
