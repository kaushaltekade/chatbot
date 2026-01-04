"use client"

import * as React from "react"
import { useChatStore } from "@/store/chat-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
    MessageSquarePlus,
    Settings,
    Trash2,
    Search,
    MessageSquare,
    Pin,
    Download,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { AuthButtons } from "@/components/auth/auth-buttons"
import { exportChat } from "@/lib/export-utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export function ChatSidebar() {
    const {
        conversations,
        activeConversationId,
        selectConversation,
        createConversation,
        deleteConversation,
        toggleConversationPin,
    } = useChatStore()

    const [searchQuery, setSearchQuery] = React.useState("")
    const [chatToDelete, setChatToDelete] = React.useState<string | null>(null)

    const filteredConversations = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations
        return conversations.filter((c) =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [conversations, searchQuery])

    const sortedConversations = React.useMemo(() => {
        return [...filteredConversations].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return b.lastUpdated - a.lastUpdated
        })
    }, [filteredConversations])

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setChatToDelete(id)
    }

    const confirmDelete = () => {
        if (chatToDelete) {
            deleteConversation(chatToDelete)
            setChatToDelete(null)
        }
    }

    return (
        <div className="w-[280px] h-screen bg-background/95 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl relative z-50">
            {/* HEADER */}
            <div className="p-4 border-b border-white/10 space-y-4">
                <div className="flex items-center gap-3 px-1">
                    <div className="relative w-8 h-8 shrink-0">
                        <img src="/file.svg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">AAAOP</h1>
                        <p className="text-[10px] text-muted-foreground tracking-wider">
                            ALL AI AT ONE PLACE
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => createConversation()}
                    className="w-full justify-start gap-2 bg-primary/90 hover:bg-primary"
                >
                    <MessageSquarePlus className="w-4 h-4" />
                    New Chat
                </Button>

                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        className="pl-8 h-9 bg-secondary border-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* CHAT LIST */}
            <ScrollArea className="flex-1 px-4 py-2">
                <div className="flex flex-col gap-1">
                    {sortedConversations.map((chat) => (
                        <div
                            key={chat.id}
                            className="group relative w-full overflow-hidden rounded-md"
                        >
                            <Button
                                variant={activeConversationId === chat.id ? "secondary" : "ghost"}
                                className={cn(
                                    "relative flex w-full items-center gap-2 px-2 py-2.5 text-sm min-w-0 justify-start",
                                    activeConversationId === chat.id
                                        ? "bg-secondary/80 text-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                                onClick={() => selectConversation(chat.id)}
                            >
                                <MessageSquare className="w-4 h-4 shrink-0" />

                                {/* TEXT */}
                                <span
                                    className={cn(
                                        "flex-1 min-w-0 text-left transition-all overflow-hidden whitespace-nowrap",
                                        "group-hover:max-w-[calc(100%-80px)]",
                                        activeConversationId === chat.id
                                            ? "text-foreground"
                                            : "group-hover:text-foreground"
                                    )}
                                    style={{
                                        maskImage: 'linear-gradient(to right, black 92%, transparent 100%)',
                                        WebkitMaskImage: 'linear-gradient(to right, black 92%, transparent 100%)'
                                    }}
                                    title={chat.title || "New Chat"}
                                >
                                    {chat.title || "New Chat"}
                                </span>
                            </Button>

                            {/* HOVER ACTIONS - GRADIENT FADE */}
                            <div
                                className="absolute right-0 top-0 h-full z-30
                                flex items-center gap-0.5 pl-0.5 pr-4
                                opacity-0 group-hover:opacity-100
                                transition-opacity duration-150
                                rounded-l-md bg-gradient-to-l from-[hsl(var(--background))] from-70% to-transparent">
                                {/* Solid background for buttons */}
                                <div className="absolute right-0 top-0 bottom-0 w-[calc(100%-20px)] bg-[hsl(var(--background))] -z-10" />
                                {/* Solid background overlay */}
                                <div className="absolute inset-0 bg-[hsl(var(--background))] -z-10" />
                                {/* PIN */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-md transition-all",
                                        chat.isPinned
                                            ? "text-primary opacity-100"
                                            : "text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
                                    )}
                                    style={{ opacity: chat.isPinned ? 1 : undefined }}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleConversationPin(chat.id)
                                    }}
                                    title={chat.isPinned ? "Unpin chat" : "Pin chat"}
                                >
                                    <Pin className={cn("w-3.5 h-3.5", chat.isPinned && "fill-current")} />
                                </Button>

                                {/* EXPORT */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 rounded-md"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        exportChat(chat)
                                    }}
                                    title="Export chat"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </Button>

                                {/* DELETE */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-md"
                                    onClick={(e) => handleDeleteClick(e, chat.id)}
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* FOOTER */}
            <div className="p-4 border-t border-white/10 space-y-2">
                <AuthButtons />
                <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                </Link>
            </div>

            {/* DELETE DIALOG */}
            <Dialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Chat?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setChatToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
