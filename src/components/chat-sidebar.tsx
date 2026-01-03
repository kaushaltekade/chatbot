"use client"

import * as React from "react"
import { useChatStore } from "@/store/chat-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MessageSquarePlus, Settings, Trash2, MoreHorizontal, Search, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import { AuthButtons } from "@/components/auth/auth-buttons"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
        isArtifactFullscreen // Added
    } = useChatStore()



    const [searchQuery, setSearchQuery] = React.useState("")

    // Filter conversations based on search
    const filteredConversations = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations
        return conversations.filter(c =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [conversations, searchQuery])

    // Sort conversations by date
    const sortedConversations = React.useMemo(() => {
        return [...filteredConversations].sort((a, b) => b.lastUpdated - a.lastUpdated)
    }, [filteredConversations])

    const [chatToDelete, setChatToDelete] = React.useState<string | null>(null)

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
            <div className="p-4 border-b border-white/10 space-y-4">
                <div className="flex items-center gap-3 px-1">
                    <div className="relative w-8 h-8 shrink-0">
                        <img
                            src="/file.svg"
                            alt="Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">AAAOP</h1>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wider">ALL AI AT ONE PLACE</p>
                    </div>
                </div>
                <Button
                    onClick={() => createConversation()}
                    className="w-full justify-start gap-2 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <MessageSquarePlus className="w-4 h-4" />
                    New Chat
                </Button>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        className="pl-8 h-9 bg-secondary border-transparent focus:bg-background transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-2">
                <div className="flex flex-col gap-1">
                    {sortedConversations.map((chat) => (
                        <div
                            key={chat.id}
                            className="group relative grid grid-cols-[1fr_auto] items-center gap-2 w-full"
                        >
                            <Button
                                variant={activeConversationId === chat.id ? "secondary" : "ghost"}
                                className={cn(
                                    "justify-start text-sm h-auto py-2.5 transition-all duration-200 border-0 rounded-lg min-w-0 w-full gap-2 px-2",
                                    activeConversationId === chat.id
                                        ? "bg-secondary/80 text-secondary-foreground shadow-sm font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal"
                                )}
                                onClick={() => selectConversation(chat.id)}
                            >
                                <MessageSquare className="w-4 h-4 shrink-0" />
                                <span className={cn(
                                    "truncate w-full text-left transition-colors block",
                                    activeConversationId === chat.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    {chat.title || "New Chat"}
                                </span>
                            </Button>

                            {/* Delete Action (Grid Col 2) */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-100"
                                onClick={(e) => handleDeleteClick(e, chat.id)}
                                title="Delete chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}

                    {conversations.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-8 px-4">
                            No chats yet.<br />Start a new conversation!
                        </div>
                    )}
                    {conversations.length > 0 && filteredConversations.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-8 px-4">
                            No chats found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-white/10 space-y-2 bg-background/30">
                <AuthButtons />
                <Link href="/settings" passHref>
                    <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-muted/50 transition-all duration-200">
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                </Link>
            </div>

            <Dialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Chat?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete this conversation. This action cannot be undone.
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
