import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface MessageBubbleProps {
    role: "user" | "assistant" | "system"
    content: string
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
    if (role === "system") return null

    return (
        <div className={cn(
            "flex w-full gap-4 p-6",
            role === "assistant" ? "bg-transparent" : "bg-transparent" // ChatGPT style: simple transparent rows
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
                    <div className="font-semibold text-base leading-relaxed whitespace-pre-wrap">
                        {content}
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
