"use client"

import * as React from "react"
import { useChatStore } from "@/store/chat-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MessageSquarePlus, Settings, Trash2, MoreHorizontal, Search } from "lucide-react"
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

export function ChatSidebar() {
    const {
        conversations,
        activeConversationId,
        selectConversation,
        createConversation,
        deleteConversation
    } = useChatStore()

    const [searchQuery, setSearchQuery] = React.useState("")

    // Filter conversations based on search
    const filteredConversations = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations
        return conversations.filter(c =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [conversations, searchQuery])

    // Group conversations by date
    const groupedConversations = React.useMemo(() => {
        const groups: Record<string, typeof conversations> = {
            "Today": [],
            "Yesterday": [],
            "Previous 7 Days": [],
            "Older": []
        }

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const yesterday = new Date(today - 86400000).getTime()
        const lastWeek = new Date(today - 86400000 * 7).getTime()

        filteredConversations.sort((a, b) => b.lastUpdated - a.lastUpdated).forEach(conv => {
            const date = new Date(conv.lastUpdated).getTime()
            if (date >= today) {
                groups["Today"].push(conv)
            } else if (date >= yesterday) {
                groups["Yesterday"].push(conv)
            } else if (date >= lastWeek) {
                groups["Previous 7 Days"].push(conv)
            } else {
                groups["Older"].push(conv)
            }
        })

        return groups
    }, [filteredConversations])

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm("Are you sure you want to delete this chat?")) {
            deleteConversation(id)
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
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wider">ALL AI IN ONE</p>
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

            <ScrollArea className="flex-1 p-3">
                <div className="flex flex-col gap-6">
                    {Object.entries(groupedConversations).map(([label, convs]) => (
                        convs.length > 0 && (
                            <div key={label} className="space-y-1">
                                <h3 className="text-xs font-semibold text-muted-foreground/70 px-3 mb-2 uppercase tracking-wider">{label}</h3>
                                {convs.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className="group relative"
                                    >
                                        <Button
                                            variant={activeConversationId === chat.id ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full justify-start text-sm truncate h-auto py-2.5 pr-8 transition-all duration-200",
                                                activeConversationId === chat.id
                                                    ? "bg-secondary/80 text-secondary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                            )}
                                            onClick={() => selectConversation(chat.id)}
                                        >
                                            <span className="truncate flex-1 text-left">
                                                {chat.title || "New Chat"}
                                            </span>
                                        </Button>

                                        {/* Action Menu (Visible on Group Hover or Active) */}
                                        <div className={cn(
                                            "absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
                                            activeConversationId === chat.id && "opacity-100"
                                        )}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-background/80"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={(e) => handleDelete(e, chat.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
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
        </div>
    )
}
