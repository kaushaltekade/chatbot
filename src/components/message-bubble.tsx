import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, Check, Pencil, RotateCcw, X, Bot, User, Sparkles, Brain, Zap, Wind, Search, Link as LinkIcon, Globe, Cpu } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useChatStream } from "@/hooks/use-chat-stream"
import { motion } from "framer-motion"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageBubbleProps {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    provider?: string
    onEdit?: (id: string, newContent: string) => void
}

function ModelIcon({ provider, className }: { provider?: string, className?: string }) {
    if (!provider) return <Bot className={className} />

    const p = provider.toLowerCase()
    if (p.includes('openai') || p.includes('gpt')) return <Cpu className={className} />
    if (p.includes('anthropic') || p.includes('claude')) return <Brain className={className} />
    if (p.includes('gemini') || p.includes('google')) return <Sparkles className={className} />
    if (p.includes('groq')) return <Zap className={className} />
    if (p.includes('mistral')) return <Wind className={className} />
    if (p.includes('perplexity')) return <Search className={className} />
    if (p.includes('cohere')) return <LinkIcon className={className} />
    if (p.includes('openrouter')) return <Globe className={className} />

    return <Bot className={className} />
}

export function MessageBubble({ id, role, content, provider, onEdit }: MessageBubbleProps) {
    const isUser = role === "user"
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(content)
    const { handleEdit, handleRegenerate } = useChatStream()

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const onEditSubmit = () => {
        if (onEdit && editContent.trim() !== content) {
            onEdit(id, editContent)
        } else if (handleEdit && editContent.trim() !== content) {
            handleEdit(id, editContent)
        }
        setIsEditing(false)
    }

    if (role === "system") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full justify-center my-4"
            >
                <div className="bg-muted/50 border border-border/50 text-muted-foreground text-xs px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm backdrop-blur-sm">
                    <span className="font-medium">{content}</span>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
                "group relative mb-8 flex w-full",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            {/* Avatar - Premium Borderless Design */}
            <div className={cn("shrink-0 flex flex-col relative pt-1", isUser ? "order-2 ml-3" : "order-1 mr-3")}>
                <div className={cn(
                    "w-8 h-8 rounded-2xl flex items-center justify-center transition-colors duration-200",
                    isUser
                        ? "bg-primary/10 text-primary" // Subtle user avatar
                        : "bg-muted text-muted-foreground" // Subtle bot avatar
                )}>
                    {isUser ? <User className="w-5 h-5" /> : <ModelIcon provider={provider} className="w-5 h-5" />}
                </div>
            </div>

            <div
                className={cn(
                    "relative max-w-[85%] rounded-[2rem] px-6 py-4 text-[15px] leading-relaxed md:max-w-[75%] lg:max-w-[65%]",
                    isUser
                        ? "bg-primary text-primary-foreground order-1"
                        : "bg-muted text-foreground order-2"
                )}
            >
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px] bg-background/50 text-foreground"
                        />
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button size="sm" onClick={onEditSubmit}>Save & Submit</Button>
                        </div>
                    </div>
                ) : (
                    <div className={cn("prose prose-sm break-words dark:prose-invert max-w-none", isUser ? "prose-p:text-white prose-headings:text-white" : "")}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <div className="rounded-xl overflow-hidden my-4 border bg-zinc-950 shadow-md">
                                            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                                <span className="text-xs text-zinc-400 font-sans font-medium">{match[1]}</span>
                                                <div className="flex gap-1.5">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                                                </div>
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
                                        <code {...props} className={cn("bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono", className)}>
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

                {/* Actions */}
                {!isEditing && (
                    <div className={cn(
                        "absolute -bottom-6 transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 scale-90",
                        isUser ? "right-0" : "left-0"
                    )}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={handleCopy}
                            title="Copy"
                        >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>

                        {isUser && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    setEditContent(content)
                                    setIsEditing(true)
                                }}
                                title="Edit"
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                        )}
                        {!isUser && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={handleRegenerate}
                                title="Regenerate"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
