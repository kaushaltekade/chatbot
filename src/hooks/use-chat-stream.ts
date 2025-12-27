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
        deleteMessage,
        setLoading,
        apiKeys,
        updateApiKey
    } = useChatStore()

    const [input, setInput] = useState("")

    const sortKeys = (keys: typeof apiKeys) => {
        return keys.sort((a, b) => {
            // Treat active keys as priority
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1

            // Calculate remaining tokens (Infinity if no limit)
            const remainingA = (a.limit && a.limit > 0) ? a.limit - (a.usage || 0) : Number.MAX_SAFE_INTEGER
            const remainingB = (b.limit && b.limit > 0) ? b.limit - (b.usage || 0) : Number.MAX_SAFE_INTEGER

            return remainingB - remainingA
        })
    }

    const getOrderedKeys = () => {
        const now = Date.now()
        const activeKeys = apiKeys.filter(k => {
            if (!k.isActive) return false
            if (k.rateLimitedUntil && k.rateLimitedUntil > now) return false
            return true
        })
        return sortKeys(activeKeys)
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim()) return

        const keysToTry = getOrderedKeys()

        if (keysToTry.length === 0) {
            const msg = "No active API keys found. Please add a key in Settings."
            toast.error(msg)
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

        // Initial Assistant Message placeholder
        let assistantMsgId = generateId()
        addMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            tokens: 0
        })

        let lastError: Error | null = null
        let success = false

        for (const apiKey of keysToTry) {
            try {
                if (lastError) {
                    toast.warning(`Switching to ${apiKey.provider}...`)
                }

                console.log(`[Chat] Trying provider: ${apiKey.provider} (${apiKey.id})`)

                const isFirstTry = keysToTry.indexOf(apiKey) === 0
                const timeoutDuration = isFirstTry ? 5000 : 20000

                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

                try {
                    const response = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
                            providerId: apiKey.provider,
                            apiKey: apiKey.key
                        }),
                        signal: controller.signal
                    })

                    if (!response.ok) {
                        const err = await response.json()
                        throw new Error(err.error || `Failed to fetch response from ${apiKey.provider}`)
                    }

                    if (!response.body) throw new Error("No response body")

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()
                    let assistantContent = ""
                    let isFirstChunk = true

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        // Clear timeout only after we receive the first byte of body data
                        // This prevents hanging on "headers received" but "no data" states
                        if (isFirstChunk) {
                            clearTimeout(timeoutId)
                            isFirstChunk = false
                        }

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

                    if (!assistantContent) {
                        throw new Error("Received empty response from provider")
                    }

                    // Finalize Token Usage
                    const inputTokens = userMsg.tokens || 0
                    const outputTokens = estimateTokens(assistantContent)
                    const totalCost = inputTokens + outputTokens

                    updateApiKey(apiKey.id, {
                        usage: (apiKey.usage || 0) + totalCost
                    })

                    updateMessage(assistantMsgId, assistantContent)
                    success = true
                    break // Stop loop on success

                } catch (innerError: any) {
                    clearTimeout(timeoutId)
                    if (innerError.name === 'AbortError') {
                        throw new Error(`Connection timed out after ${timeoutDuration / 1000}s`)
                    }
                    throw innerError
                }

            } catch (error: any) {
                console.error(`Error with ${apiKey.provider}:`, error)
                lastError = error

                // Smart Disabling: If error is permanent (Quota/Auth), lock the key for 24 hours
                const isFatal =
                    error.message.includes("Quota") ||
                    error.message.includes("Insufficient") ||
                    error.message.includes("401") ||
                    error.message.includes("429") ||
                    error.message.includes("Invalid")

                if (isFatal) {
                    const twentyFourHours = 24 * 60 * 60 * 1000
                    updateApiKey(apiKey.id, {
                        rateLimitedUntil: Date.now() + twentyFourHours,
                        label: `${apiKey.label || apiKey.provider} (Locked 24h)`
                    })
                    toast.error(`${apiKey.provider} locked for 24h (Quota/Limit).`)
                }

                // Show switch message in chat
                if (keysToTry.indexOf(apiKey) < keysToTry.length - 1) {
                    const nextProvider = keysToTry[keysToTry.indexOf(apiKey) + 1].provider

                    // REORDERING LOGIC:
                    // 1. Delete the "Thinking" placeholder that failed (to remove the "Error" bubble)
                    deleteMessage(assistantMsgId)

                    // 2. Add the System Info Message (Pill)
                    const switchMsg: Message = {
                        id: generateId(),
                        role: "system",
                        content: `⚠️ Error with ${apiKey.provider}: ${error.message}\n🔄 Switching to ${nextProvider}...`,
                        tokens: 0
                    }
                    addMessage(switchMsg)

                    // 3. Create a NEW "Thinking" placeholder for the next try
                    assistantMsgId = generateId()
                    addMessage({
                        id: assistantMsgId,
                        role: "assistant",
                        content: "",
                        tokens: 0
                    })

                    // Only show the "Switching" toast if we didn't just show a "Disabled" toast (to avoid spam)
                    if (!isFatal) {
                        toast.warning(`Error with ${apiKey.provider}. Switching to ${nextProvider}...`)
                    }
                }
            }
        }

        if (!success) {
            const finalErrorMsg = lastError?.message || "All providers failed."
            toast.error(finalErrorMsg)
            updateMessage(assistantMsgId, "Error: " + finalErrorMsg)
        }

        setLoading(false)
    }

    return {
        input,
        setInput,
        handleSubmit,
        messages
    }
}
