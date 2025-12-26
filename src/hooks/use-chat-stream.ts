import { useState } from "react"
import { useChatStore, Message } from "@/store/chat-store"
import { formatTokenCount, estimateTokens } from "@/lib/token-utils"
import { generateId } from "@/lib/utils"
import { toast } from "sonner"

export function useChatStream() {
    const {
        messages,
        addMessage,
        updateMessage,
        setLoading,
        apiKeys,
        updateApiKey
    } = useChatStore()

    const [input, setInput] = useState("")

    const getBestApiKey = (providerId?: string) => {
        // 1. Try to find key for specific provider if requested
        if (providerId) {
            const specificKeys = apiKeys.filter(k => k.provider === providerId && k.isActive)
            if (specificKeys.length > 0) {
                const sorted = sortKeys(specificKeys)
                console.log(`[getBestApiKey] Selected key for ${providerId}: ${sorted[0].id} (Remaining: ${sorted[0].limit ? sorted[0].limit - sorted[0].usage : '∞'})`)
                return sorted[0]
            }
        }

        // 2. Fallback: Find ANY active key
        const allActiveKeys = apiKeys.filter(k => k.isActive)
        if (allActiveKeys.length === 0) {
            console.warn(`[getBestApiKey] No active keys found for any provider`)
            return null
        }

        const sorted = sortKeys(allActiveKeys)
        console.log(`[getBestApiKey] Selected fallback key: ${sorted[0].id} (Remaining: ${sorted[0].limit ? sorted[0].limit - sorted[0].usage : '∞'})`)
        return sorted[0]
    }

    const sortKeys = (keys: typeof apiKeys) => {
        return keys.sort((a, b) => {
            const remainingA = a.limit && a.limit > 0 ? a.limit - a.usage : Number.MAX_SAFE_INTEGER
            const remainingB = b.limit && b.limit > 0 ? b.limit - b.usage : Number.MAX_SAFE_INTEGER
            return remainingB - remainingA
        })
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim()) return

        // Try to get OpenAI first, but fallback to anything available
        const apiKey = getBestApiKey("openai") || getBestApiKey()

        if (!apiKey) {
            const msg = "No active API keys found. Please add a key in Settings for OpenAI or any other provider."
            toast.error(msg)
            console.error(msg)
            return
        }

        const userMsg: Message = {
            id: generateId(),
            role: "user",
            content: input,
            tokens: estimateTokens(input)
        }

        addMessage(userMsg)
        setInput("")
        setLoading(true)

        // Initial Assistant Message
        const assistantMsgId = generateId()
        addMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            tokens: 0
        })

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
                    providerId: apiKey.provider,
                    apiKey: apiKey.key
                })
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || "Failed to fetch response")
            }

            if (!response.body) throw new Error("No response body")

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let assistantContent = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split("\n\n")

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.isDone) continue

                            if (data.content) {
                                assistantContent += data.content
                                updateMessage(assistantMsgId, assistantContent)
                            }
                        } catch (e) {
                            // ignore parse errors for partial chunks
                        }
                    }
                }
            }

            // Finalize Token Usage
            const inputTokens = userMsg.tokens || 0
            const outputTokens = estimateTokens(assistantContent)
            const totalCost = inputTokens + outputTokens

            // Update Key Usage
            // Note: Ideally this should happen atomically or be verified by backend
            updateApiKey(apiKey.id, {
                usage: (apiKey.usage || 0) + totalCost
            })

            // Update message token count
            updateMessage(assistantMsgId, assistantContent) // Ensure final content
            // Note: I can't easily update 'tokens' property on message with 'updateMessage' currently as it only takes content
            // I might need to expand updateMessage signature later.

        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
            updateMessage(assistantMsgId, "Error: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return {
        input,
        setInput,
        handleSubmit,
        messages
    }
}
