"use client"

import Image from "next/image"
import { useRef, useEffect } from "react"
import { useChatStream } from "@/hooks/use-chat-stream"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "@/components/message-bubble"
import { Send, RotateCcw, Square } from "lucide-react"
import { PromptLibrary } from "@/components/prompt-library"

interface ChatPaneProps {
    conversationId?: string | null
    isActive?: boolean
    onFocus?: () => void
    className?: string
}

export function ChatPane({ conversationId, isActive, onFocus, className }: ChatPaneProps) {
    // Pass undefined if null to satisfy the hook's type
    const { messages, input, setInput, handleSubmit, handleRegenerate, handleEdit, isLoading, stop } = useChatStream(conversationId || undefined)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    // Reset textarea height
    useEffect(() => {
        if (input === '' && textareaRef.current) {
            textareaRef.current.style.height = '36px'
        }
    }, [input])

    return (
        <div
            className={cn(
                "flex-1 flex flex-col h-full min-w-0 bg-background relative transition-all duration-200",
                isActive ? "ring-2 ring-primary/20 bg-background/50" : "opacity-80 grayscale-[0.3]",
                className
            )}
            onClick={onFocus}
        >
            <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-2">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
                            <div className="space-y-4">
                                <div className="bg-primary/10 p-4 rounded-full inline-block">
                                    <Image src="/file.svg" alt="Logo" width={48} height={48} className="w-20 h-12" />
                                </div>
                                <h2 className="text-2xl font-semibold">
                                    {isActive ? "How can I help you today?" : "Select to Activate"}
                                </h2>
                            </div>

                            <PromptLibrary
                                className="w-full text-left"
                                onSelect={(content) => {
                                    if (onFocus) onFocus()
                                    setInput(content)
                                    if (textareaRef.current) {
                                        textareaRef.current.focus()
                                    }
                                }}
                            />
                        </div>
                    )}

                    {messages.map((m) => (
                        <MessageBubble
                            key={m.id}
                            id={m.id}
                            role={m.role}
                            content={m.content}
                            provider={m.provider}
                            onEdit={handleEdit}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 pb-6 bg-background">
                <div className="max-w-3xl mx-auto w-full relative">
                    <form
                        onSubmit={(e) => {
                            if (onFocus) onFocus()
                            handleSubmit(e)
                        }}
                        className="relative flex items-end gap-2 bg-muted/50 rounded-3xl border focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all shadow-sm pl-2"
                    >
                        <Textarea
                            ref={textareaRef}
                            suppressHydrationWarning
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value)
                                e.target.style.height = 'auto'
                                e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            onFocus={onFocus}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    if (onFocus) onFocus()
                                    handleSubmit(e as any)
                                }
                            }}
                            placeholder={isActive ? "Message AAAOP..." : "Click to chat..."}
                            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pr-12 py-2 h-[36px] min-h-[36px] max-h-48 resize-none overflow-hidden scrollbar-hide text-sm"
                            rows={1}
                        />



                        {isLoading ? (
                            <Button
                                type="button"
                                size="icon"
                                onClick={stop}
                                className="absolute right-1 bottom-[2px] h-8 w-8 rounded-full transition-all hover:scale-105 active:scale-95 z-10 bg-red-500 hover:bg-red-600 animate-pulse"
                            >
                                <Square className="w-3 h-3 fill-current" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim()}
                                className="absolute right-1 bottom-[2px] h-8 w-8 rounded-full transition-all disabled:opacity-20 hover:scale-105 active:scale-95 z-10"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        )}
                    </form>

                    {/* Regenerate Button Helper */}
                    {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                        <div className="absolute -top-12 right-0 flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRegenerate}
                                className="text-xs flex items-center gap-1 h-8 bg-background/80 backdrop-blur"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Regenerate
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
