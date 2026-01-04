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
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FolderPlus, Folder as FolderIcon, ChevronRight, FolderMinus, MoreHorizontal } from "lucide-react"

export function ChatSidebar() {
    const {
        conversations,
        activeConversationId,
        selectConversation,
        createConversation,
        deleteConversation,
        toggleConversationPin,
        folders,
        createFolder,
        deleteFolder,
        renameFolder,
        moveChatToFolder
    } = useChatStore()

    const [searchQuery, setSearchQuery] = React.useState("")
    const [chatToDelete, setChatToDelete] = React.useState<string | null>(null)
    const [folderToDelete, setFolderToDelete] = React.useState<string | null>(null)
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set())
    const [isRenamingFolder, setIsRenamingFolder] = React.useState<string | null>(null)
    const [renameFolderName, setRenameFolderName] = React.useState("")

    // Initialize expanded folders
    React.useEffect(() => {
        // Expand all by default or load from local storage? Let's expand all for now
        if (folders.length > 0 && expandedFolders.size === 0) {
            setExpandedFolders(new Set(folders.map(f => f.id)))
        }
    }, [folders.length])

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders)
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId)
        } else {
            newExpanded.add(folderId)
        }
        setExpandedFolders(newExpanded)
    }

    const filteredConversations = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations
        return conversations.filter((c) =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [conversations, searchQuery])

    // Group conversations by folder
    const { folderChats, rootChats } = React.useMemo(() => {
        const folderChats: Record<string, typeof conversations> = {}
        const rootChats: typeof conversations = []

        // Initialize folder arrays
        folders.forEach(f => folderChats[f.id] = [])

        // Helper to sort
        const sortFn = (a: typeof conversations[0], b: typeof conversations[0]) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return b.lastUpdated - a.lastUpdated
        }

        filteredConversations.forEach(c => {
            if (c.folderId && folderChats[c.folderId]) {
                folderChats[c.folderId].push(c)
            } else {
                rootChats.push(c)
            }
        })

        // Sort inside folders and root
        Object.keys(folderChats).forEach(id => folderChats[id].sort(sortFn))
        rootChats.sort(sortFn)

        return { folderChats, rootChats }
    }, [filteredConversations, folders])


    const handleDeleteClick = (id: string) => {
        setChatToDelete(id)
    }

    const confirmDelete = () => {
        if (chatToDelete) {
            deleteConversation(chatToDelete)
            setChatToDelete(null)
        }
    }

    const handleCreateFolder = () => {
        createFolder("New Folder")
    }

    const handleRenameFolderSubmit = (id: string) => {
        if (renameFolderName.trim()) {
            renameFolder(id, renameFolderName.trim())
        }
        setIsRenamingFolder(null)
    }

    return (
        <div className="w-[280px] h-screen bg-background/95 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl relative z-50">
            {/* HEADER */}
            <div className="p-4 border-b border-white/10 space-y-4">
                <div className="flex items-center gap-3 px-1">
                    <div className="relative w-8 h-8 shrink-0">
                        <img src="/file.svg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() => createConversation()}
                        className="flex-1 justify-start gap-2 bg-primary/90 hover:bg-primary text-xs h-9 px-3"
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                        New Chat
                    </Button>
                    <Button
                        onClick={handleCreateFolder}
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title="New Folder"
                    >
                        <FolderPlus className="w-4 h-4" />
                    </Button>
                </div>

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
                <div className="flex flex-col gap-1 pb-4">
                    {/* FOLDERS */}
                    {folders.map(folder => (
                        <div key={folder.id} className="mb-1">
                            {/* FOLDER HEADER */}
                            <ContextMenu>
                                <ContextMenuTrigger>
                                    <div
                                        className="group flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted/50 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => toggleFolder(folder.id)}
                                    >
                                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expandedFolders.has(folder.id) && "rotate-90")} />

                                        {isRenamingFolder === folder.id ? (
                                            <Input
                                                autoFocus
                                                value={renameFolderName}
                                                onChange={e => setRenameFolderName(e.target.value)}
                                                onBlur={() => handleRenameFolderSubmit(folder.id)}
                                                onKeyDown={e => e.key === 'Enter' && handleRenameFolderSubmit(folder.id)}
                                                onClick={e => e.stopPropagation()}
                                                className="h-6 text-xs px-1 py-0"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 flex-1">
                                                <FolderIcon className="w-3.5 h-3.5 fill-current/20" />
                                                <span className="font-medium text-xs tracking-wide">{folder.name}</span>
                                                <span className="text-[10px] text-muted-foreground/50 ml-auto">{folderChats[folder.id]?.length || 0}</span>
                                            </div>
                                        )}
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="bg-zinc-950 border-zinc-800">
                                    <ContextMenuItem onClick={() => {
                                        setRenameFolderName(folder.name)
                                        setIsRenamingFolder(folder.id)
                                    }}>
                                        Rename Folder
                                    </ContextMenuItem>
                                    <ContextMenuItem className="text-red-500 focus:text-red-500" onClick={() => setFolderToDelete(folder.id)}>
                                        Delete Folder
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>

                            {/* FOLDER CONTENTS */}
                            {expandedFolders.has(folder.id) && (
                                <div className="ml-0 pl-2 border-l border-white/5 flex flex-col gap-0.5 mt-0.5">
                                    {(folderChats[folder.id] || []).map(chat => (
                                        <ChatItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={activeConversationId === chat.id}
                                            onSelect={() => selectConversation(chat.id)}
                                            onDelete={() => handleDeleteClick(chat.id)}
                                            onPin={toggleConversationPin}
                                            onMove={(folderId) => moveChatToFolder(chat.id, folderId)}
                                            folders={folders}
                                        />
                                    ))}
                                    {(!folderChats[folder.id] || folderChats[folder.id].length === 0) && (
                                        <div className="px-3 py-2 text-[10px] text-muted-foreground/40 italic">
                                            Empty folder
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* ROOT CHATS */}
                    {rootChats.map((chat) => (
                        <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={activeConversationId === chat.id}
                            onSelect={() => selectConversation(chat.id)}
                            onDelete={() => handleDeleteClick(chat.id)}
                            onPin={toggleConversationPin}
                            onMove={(folderId) => moveChatToFolder(chat.id, folderId)}
                            folders={folders}
                        />
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

            {/* DELETE CHAT DIALOG */}
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

            {/* DELETE FOLDER DIALOG */}
            <Dialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Folder?</DialogTitle>
                        <DialogDescription>
                            This will delete the folder. Chats inside will be moved to the main list.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setFolderToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => {
                            if (folderToDelete) deleteFolder(folderToDelete)
                            setFolderToDelete(null)
                        }}>
                            Delete Folder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Extracted for cleaner render and context menus
interface ChatItemProps {
    chat: any // TODO: specific type
    isActive: boolean
    onSelect: () => void
    onDelete: (e: React.MouseEvent) => void
    onPin: (id: string) => void
    onMove: (folderId: string | null) => void
    folders: any[]
}

function ChatItem({ chat, isActive, onSelect, onDelete, onPin, onMove, folders }: ChatItemProps) {
    const handleMove = (folderId: string | null) => {
        onMove(folderId)
    }

    const handlePin = () => {
        onPin(chat.id)
    }

    const handleDelete = () => {
        onDelete({ stopPropagation: () => { } } as React.MouseEvent)
    }

    const handleExport = () => {
        exportChat(chat)
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className="group relative w-full overflow-hidden rounded-md mb-0.5">
                    <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                            "relative flex w-full items-center gap-2 px-2 py-2 text-sm min-w-0 justify-start h-9",
                            isActive
                                ? "bg-secondary/80 text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        onClick={onSelect}
                    >
                        <MessageSquare className="w-4 h-4 shrink-0" />

                        {/* TEXT */}
                        <span
                            className={cn(
                                "flex-1 min-w-0 text-left transition-all overflow-hidden whitespace-nowrap",
                                "group-hover:max-w-[calc(100%-60px)]",
                                isActive
                                    ? "text-foreground"
                                    : "group-hover:text-foreground"
                            )}
                            style={{
                                maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
                            }}
                            title={chat.title || "New Chat"}
                        >
                            {chat.title || "New Chat"}
                        </span>

                        {/* PIN ICON IF PINNED (Always visible) */}
                        {chat.isPinned && (
                            <Pin className="w-3 h-3 ml-auto text-primary fill-current shrink-0" />
                        )}
                    </Button>

                    {/* ACTIONS - SHOW ON HOVER */}
                    <div
                        className={cn(
                            "absolute right-4 top-1.5 z-50 flex items-center justify-center",
                            "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        )}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md bg-zinc-950/50 backdrop-blur-sm border border-white/5 shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800 shadow-xl" collisionPadding={10}>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePin() }}>
                                    <Pin className={cn("mr-2 h-4 w-4", chat.isPinned && "fill-current")} />
                                    {chat.isPinned ? "Unpin Chat" : "Pin Chat"}
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <FolderIcon className="mr-2 h-4 w-4" />
                                        Move to Folder
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-48 bg-zinc-950 border-zinc-800 shadow-xl" collisionPadding={10}>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMove(null) }}>
                                            <FolderMinus className="mr-2 h-4 w-4" />
                                            No Folder (Root)
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-zinc-800" />
                                        {folders.map((f: any) => (
                                            <DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); handleMove(f.id) }}>
                                                <FolderIcon className="mr-2 h-4 w-4" />
                                                {f.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport() }}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Chat
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDelete() }}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Chat
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-zinc-950 border-zinc-800 shadow-xl">
                <ContextMenuItem onClick={handlePin}>
                    <Pin className={cn("mr-2 h-4 w-4", chat.isPinned && "fill-current")} />
                    {chat.isPinned ? "Unpin Chat" : "Pin Chat"}
                </ContextMenuItem>
                <ContextMenuSub>
                    <ContextMenuSubTrigger inset>Move to Folder</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48 bg-zinc-950 border-zinc-800 shadow-xl">
                        <ContextMenuItem onClick={() => handleMove(null)}>
                            <FolderMinus className="mr-2 h-4 w-4" />
                            No Folder (Root)
                        </ContextMenuItem>
                        <ContextMenuSeparator className="bg-zinc-800" />
                        {folders.map((f: any) => (
                            <ContextMenuItem key={f.id} onClick={() => handleMove(f.id)}>
                                <FolderIcon className="mr-2 h-4 w-4" />
                                {f.name}
                            </ContextMenuItem>
                        ))}
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator className="bg-zinc-800" />
                <ContextMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Chat
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-800" />
                <ContextMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Chat
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
