import { useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from "@/lib/utils"
import { Bot, User, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "./ui/textarea"

interface MessageBubbleProps {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    onEdit?: (id: string, newContent: string) => void
}

export function MessageBubble({ id, role, content, onEdit }: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(content)

    const handleSave = () => {
        if (onEdit && editContent.trim() !== content) {
            onEdit(id, editContent)
        }
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditContent(content)
        setIsEditing(false)
    }

    if (role === "system") {
        return (
            <div className="flex w-full justify-center my-4">
                <div className="bg-muted/50 border border-border/50 text-muted-foreground text-xs px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-[10px] border border-yellow-500/20">!</div>
                    <span className="font-medium">{content}</span>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "flex w-full gap-4 p-6 group", // Added group for hover visibility
            role === "assistant" ? "bg-transparent" : "bg-transparent"
        )}>
            {/* Avatar */}
            <div className="shrink-0 flex flex-col relative items-end">
                <div className={cn(
                    "w-8 h-8 rounded-sm flex items-center justify-center border shadow-sm",
                    role === "assistant" ? "bg-primary text-primary-foreground border-transparent" : "bg-background border-border"
                )}>
                    {role === "assistant" ? (
                        <Bot className="w-5 h-5" />
                    ) : (
                        <User className="w-5 h-5 text-foreground" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-hidden">
                {role === "user" ? (
                    <div className="group relative">
                        {isEditing ? (
                            <div className="bg-muted/50 p-4 rounded-md border space-y-3">
                                <Textarea
                                    value={editContent}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                                    className="min-h-[100px] bg-background"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                                        <X className="w-4 h-4 mr-1" /> Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSave}>
                                        <Check className="w-4 h-4 mr-1" /> Save & Submit
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="font-semibold text-base leading-relaxed whitespace-pre-wrap pr-8">
                                {content}
                                {onEdit && (
                                    <button
                                        onClick={() => {
                                            setEditContent(content)
                                            setIsEditing(true)
                                        }}
                                        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                        title="Edit message"
                                    >
                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none text-base leading-relaxed break-words">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <div className="rounded-md overflow-hidden my-4 border bg-zinc-950">
                                            <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-b border-zinc-800">
                                                <span className="text-xs text-zinc-400 font-sans">{match[1]}</span>
                                            </div>
                                            <SyntaxHighlighter
                                                {...props}
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent' }}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        </div>
                                    ) : (
                                        <code {...props} className={cn("bg-muted px-1.5 py-0.5 rounded text-sm font-mono", className)}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    )
}
