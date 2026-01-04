"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Search, BookTemplate, ChevronDown } from "lucide-react"
import { usePromptStore, Prompt } from "@/store/prompt-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PromptLibraryProps {
    onSelect: (content: string) => void
    className?: string
}

export function PromptLibrary({ onSelect, className }: PromptLibraryProps) {
    const { prompts, addPrompt, updatePrompt, deletePrompt, usePrompt } = usePromptStore()
    const [search, setSearch] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
    const [formData, setFormData] = useState({ title: "", content: "", category: "General" })
    const [shuffledPrompts, setShuffledPrompts] = useState<Prompt[]>([])

    // Shuffle prompts on mount to show different suggestions each time
    useEffect(() => {
        const shuffled = [...prompts].sort(() => Math.random() - 0.5)
        setShuffledPrompts(shuffled)
    }, [prompts])

    // Re-filter when search changes
    const displayPrompts = search
        ? prompts.filter(p =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.content.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.toLowerCase().includes(search.toLowerCase())
        )
        : shuffledPrompts

    const featuredPrompts = displayPrompts.slice(0, 3)
    const morePrompts = displayPrompts.slice(3)

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) {
            setEditingPrompt(null)
            setFormData({ title: "", content: "", category: "General" })
        }
    }

    const handleEditClick = (e: React.MouseEvent, prompt: Prompt) => {
        e.stopPropagation()
        setEditingPrompt(prompt)
        setFormData({ title: prompt.title, content: prompt.content, category: prompt.category || "General" })
        setIsDialogOpen(true)
    }

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm("Are you sure you want to delete this prompt?")) {
            deletePrompt(id)
        }
    }

    const handleSubmit = () => {
        if (!formData.title || !formData.content) return

        if (editingPrompt) {
            updatePrompt(editingPrompt.id, formData)
        } else {
            addPrompt(formData)
        }
        handleOpenChange(false)
    }

    const handleSelect = (prompt: Prompt) => {
        usePrompt(prompt.id)
        onSelect(prompt.content)
    }

    const PromptCard = ({ prompt, className, compact = false }: { prompt: Prompt; className?: string; compact?: boolean }) => (
        <Card
            className={cn(
                "group hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden bg-muted/20 border-muted-foreground/10 flex flex-col",
                compact ? "h-32 w-60" : "h-40",
                className
            )}
            onClick={() => handleSelect(prompt)}
        >
            <CardHeader className="pb-1.5 pt-4 px-4">
                <CardTitle className="text-base font-medium flex items-center justify-between gap-2">
                    <span className="truncate">{prompt.title}</span>
                    {prompt.category && (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-background border text-muted-foreground shrink-0">
                            {prompt.category}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4 flex-1">
                <p className={cn(
                    "text-sm text-muted-foreground leading-relaxed",
                    compact ? "line-clamp-2" : "line-clamp-3"
                )}>
                    {prompt.content}
                </p>
            </CardContent>
            <div className="hidden group-hover:flex absolute top-2 right-2 bg-background/80 backdrop-blur rounded-md border shadow-sm z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => handleEditClick(e, prompt)}
                >
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!prompt.isBuiltIn && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-red-500"
                        onClick={(e) => handleDeleteClick(e, prompt.id)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </Card>
    )

    return (
        <div className={cn("w-full max-w-5xl mx-auto space-y-8", className)}>
            <div className="flex items-center justify-between gap-4 px-1">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search prompts..."
                        className="pl-8 h-8 text-sm bg-muted/30 border-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground">
                            <Plus className="h-3.5 w-3.5" />
                            New Prompt
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPrompt ? "Edit Prompt" : "Create Prompt"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Fix Code"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Input
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Coding"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Content</label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Enter your prompt template..."
                                    className="h-32 resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={!formData.title || !formData.content}>
                                {editingPrompt ? "Save Changes" : "Create Prompt"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Featured Prompts (Top 3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featuredPrompts.map((prompt) => (
                    <PromptCard key={prompt.id} prompt={prompt} />
                ))}
            </div>

            {/* More Prompts Vertical Scroll */}
            {morePrompts.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-70">More Suggestions</span>
                        <div className="h-px flex-1 bg-border/50" />
                    </div>
                    <div className="rounded-md border bg-muted/10 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {morePrompts.map((prompt) => (
                                <PromptCard key={prompt.id} prompt={prompt} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {displayPrompts.length === 0 && (
                <div className="w-full flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <BookTemplate className="h-8 w-8 mb-2 opacity-50" />
                    <p>No prompts found</p>
                </div>
            )}
        </div>
    )
}
