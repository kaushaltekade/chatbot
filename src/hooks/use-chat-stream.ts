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
        isLoading,
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

    const getOrderedKeys = (inputPrompt: string) => {
        const { smartRoutingEnabled } = useChatStore.getState()
        const now = Date.now()
        let activeKeys = apiKeys.filter(k => {
            if (!k.isActive) return false
            if (k.rateLimitedUntil && k.rateLimitedUntil > now) return false
            return true
        })

        if (!smartRoutingEnabled) {
            return sortKeys(activeKeys)
        }

        // --- SMART ROUTING LOGIC ---
        const lowerPrompt = inputPrompt.toLowerCase()

        // 1. CODING
        const codingKeywords = ['code', 'function', 'script', 'react', 'typescript', 'python', 'html', 'css', 'sql', 'bug', 'error', 'debug', 'json', 'api', 'component', 'class', 'method']
        const isCoding = codingKeywords.some(k => lowerPrompt.includes(k))

        // 2. REASONING / MATH
        const reasoningKeywords = ['math', 'solve', 'calculate', 'proof', 'theorem', 'logic', 'analyze', 'explain', 'why']
        const isReasoning = reasoningKeywords.some(k => lowerPrompt.includes(k))

        // 3. SEARCH / CURRENT EVENTS
        const searchKeywords = ['search', 'find', 'latest', 'news', 'price', 'weather', 'who is', 'what is', 'current']
        const isSearch = searchKeywords.some(k => lowerPrompt.includes(k))

        return activeKeys.sort((a, b) => {
            let scoreA = 0
            let scoreB = 0

            // Helper to score providers
            const getScore = (p: string) => {
                if (isCoding) {
                    if (p === 'deepseek' || p === 'anthropic' || p === 'mistral') return 10
                    if (p === 'openai') return 8
                }
                if (isReasoning) {
                    if (p === 'deepseek' || p === 'openai' || p === 'anthropic') return 10
                    if (p === 'cohere') return 8
                }
                if (isSearch) {
                    if (p.includes('perplexity')) return 10
                    if (p === 'gemini') return 8 // Gemini has search grounding often
                }
                return 0
            }

            scoreA = getScore(a.provider)
            scoreB = getScore(b.provider)

            if (scoreA !== scoreB) return scoreB - scoreA // Higher score first

            // Fallback to remaining tokens/limit logic
            const remainingA = (a.limit && a.limit > 0) ? a.limit - (a.usage || 0) : Number.MAX_SAFE_INTEGER
            const remainingB = (b.limit && b.limit > 0) ? b.limit - (b.usage || 0) : Number.MAX_SAFE_INTEGER
            return remainingB - remainingA
        })
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim()) return

        const keysToTry = getOrderedKeys(input)

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
                // Perplexity and Cohere need more time. Others get 5s speed check.
                const timeoutDuration = (apiKey.provider === 'perplexity' || apiKey.provider === 'cohere')
                    ? 30000
                    : (isFirstTry ? 5000 : 20000)

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
                    const newUsage = (apiKey.usage || 0) + totalCost

                    updateApiKey(apiKey.id, {
                        usage: newUsage
                    })

                    // LIMIT WARNING LOGIC
                    if (apiKey.limit && apiKey.limit > 0) {
                        const percentage = newUsage / apiKey.limit
                        if (percentage >= 0.9) {
                            toast.error(`CRITICAL: You have used ${Math.floor(percentage * 100)}% of your limit for ${apiKey.provider}`)
                        } else if (percentage >= 0.8) {
                            toast.warning(`Alert: You have used ${Math.floor(percentage * 100)}% of your limit for ${apiKey.provider}`)
                        }
                    }

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

                // LOCK LOGIC:
                const twentyFourHours = 24 * 60 * 60 * 1000
                updateApiKey(apiKey.id, {
                    rateLimitedUntil: Date.now() + twentyFourHours,
                    label: `${apiKey.label || apiKey.provider} (Locked 24h - Error)`
                })

                // Show switch message in chat
                if (keysToTry.indexOf(apiKey) < keysToTry.length - 1) {
                    const nextProvider = keysToTry[keysToTry.indexOf(apiKey) + 1].provider

                    // REORDERING LOGIC:
                    deleteMessage(assistantMsgId)
                    assistantMsgId = generateId()
                    addMessage({
                        id: assistantMsgId,
                        role: "assistant",
                        content: "",
                        tokens: 0
                    })

                    // Explicitly notify user about context preservation
                    toast.warning(`Error with ${apiKey.provider}. Switching to ${nextProvider}... (Context Preserved)`, {
                        description: "Your full conversation history is being sent to the next provider.",
                        position: 'bottom-right',
                        duration: 5000
                    })
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

    const handleRegenerate = async () => {
        const currentMessages = useChatStore.getState().messages
        if (currentMessages.length === 0) return

        const lastMessage = currentMessages[currentMessages.length - 1]

        // Ensure last message is from assistant
        if (lastMessage.role !== 'assistant') return

        // 1. Delete the last assistant message
        deleteMessage(lastMessage.id)

        // 2. Find the last user message to use as prompt
        // Search backwards in the list *before* modifications
        const lastUserMsg = [...currentMessages].reverse().find(m => m.role === 'user')

        if (!lastUserMsg) return

        // 3. Trigger re-submission using logic similar to handleSubmit but without adding a new user message
        // We set loading to true immediately
        setLoading(true)

        const keysToTry = getOrderedKeys(lastUserMsg.content)

        if (keysToTry.length === 0) {
            toast.error("No active API keys found.")
            setLoading(false)
            return
        }

        // Create placeholder for new response
        let assistantMsgId = generateId()
        addMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            tokens: 0
        })

        let lastError: Error | null = null
        let success = false

        // We act on the history WITHOUT the just-deleted assistant message
        const historyForRegen = currentMessages.slice(0, -1)

        for (const apiKey of keysToTry) {
            try {
                if (lastError) toast.warning(`Switching to ${apiKey.provider}...`)

                const isFirstTry = keysToTry.indexOf(apiKey) === 0
                const timeoutDuration = (apiKey.provider === 'perplexity' || apiKey.provider === 'cohere') ? 30000 : (isFirstTry ? 5000 : 20000)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

                try {
                    const response = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            messages: historyForRegen.map(m => ({ role: m.role, content: m.content })),
                            providerId: apiKey.provider,
                            apiKey: apiKey.key
                        }),
                        signal: controller.signal
                    })

                    if (!response.ok) {
                        const err = await response.json()
                        throw new Error(err.error || `Failed`)
                    }
                    if (!response.body) throw new Error("No body")

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()
                    let assistantContent = ""
                    let isFirstChunk = true

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        if (isFirstChunk) { clearTimeout(timeoutId); isFirstChunk = false }

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
                                } catch (e) { }
                            }
                        }
                    }

                    if (!assistantContent) throw new Error("Empty response")

                    const inputTokens = lastUserMsg.tokens || 0
                    const outputTokens = estimateTokens(assistantContent)
                    updateApiKey(apiKey.id, { usage: (apiKey.usage || 0) + inputTokens + outputTokens })
                    updateMessage(assistantMsgId, assistantContent)
                    success = true
                    break

                } catch (innerError: any) {
                    clearTimeout(timeoutId)
                    if (innerError.name === 'AbortError') throw new Error(`Timeout ${timeoutDuration / 1000}s`)
                    throw innerError
                }

            } catch (error: any) {
                console.error(`Error with ${apiKey.provider}:`, error)
                lastError = error

                // LOCK LOGIC:
                const twentyFourHours = 24 * 60 * 60 * 1000
                updateApiKey(apiKey.id, {
                    rateLimitedUntil: Date.now() + twentyFourHours,
                    label: `${apiKey.label || apiKey.provider} (Locked 24h - Error)`
                })

                // Only show the "Switching" toast
                if (keysToTry.indexOf(apiKey) < keysToTry.length - 1) {
                    toast.warning(`Error with ${apiKey.provider}. Switching to...`, {
                        position: 'bottom-right'
                    })
                }
                // Note: handleRegenerate doesn't have the same complex "Thinking" message re-creation logic 
                // because it just loops. We rely on the final updateMessage/addMessage outside.
                // Actually, we should probably tell the user we are switching.
            }
        }

        if (!success) {
            const finalErrorMsg = lastError?.message || "Failed to regenerate."
            toast.error(finalErrorMsg)
            updateMessage(assistantMsgId, "Error: " + finalErrorMsg)
        }
        setLoading(false)
    }

    const handleEdit = async (messageId: string, newContent: string) => {
        const currentMessages = useChatStore.getState().messages
        const msgIndex = currentMessages.findIndex(m => m.id === messageId)

        if (msgIndex === -1) return

        // 1. Truncate history: Keep messages up to the edited one
        // We want to keep 0..msgIndex.
        // Actually, we want to update the message at msgIndex, and delete everything AFTER it.
        const newHistory = currentMessages.slice(0, msgIndex + 1)

        // 2. Update the specific message content
        newHistory[msgIndex] = { ...newHistory[msgIndex], content: newContent }

        // 3. Update Store with truncated history
        // We validly "fork" here.
        // We need to manually update the store state.
        useChatStore.setState(state => {
            const updatedConversations = state.conversations.map(c =>
                c.id === state.activeConversationId
                    ? { ...c, messages: newHistory, lastUpdated: Date.now() }
                    : c
            )
            return { messages: newHistory, conversations: updatedConversations }
        })

        // 4. Trigger submission logic
        // We behave as if the user just sent this message, but we need to NOT add it again.
        // We need to re-use the "generate response" logic.

        setLoading(true)
        const keysToTry = getOrderedKeys(newContent)

        if (keysToTry.length === 0) {
            toast.error("No active API keys found.")
            setLoading(false)
            return
        }

        // Placeholder for new Assistant response
        let assistantMsgId = generateId()
        addMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            tokens: 0
        })

        let lastError: Error | null = null
        let success = false

        // History for API is the new truncated history (which ends with the edited User message)
        const historyForApi = newHistory

        for (const apiKey of keysToTry) {
            try {
                if (lastError) toast.warning(`Switching to ${apiKey.provider}...`)

                const isFirstTry = keysToTry.indexOf(apiKey) === 0
                const timeoutDuration = (apiKey.provider === 'perplexity' || apiKey.provider === 'cohere') ? 30000 : (isFirstTry ? 5000 : 20000)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

                try {
                    const response = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            messages: historyForApi.map(m => ({ role: m.role, content: m.content })),
                            providerId: apiKey.provider,
                            apiKey: apiKey.key
                        }),
                        signal: controller.signal
                    })

                    if (!response.ok) {
                        const err = await response.json()
                        throw new Error(err.error || `Failed`)
                    }
                    if (!response.body) throw new Error("No body")

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()
                    let assistantContent = ""
                    let isFirstChunk = true

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        if (isFirstChunk) { clearTimeout(timeoutId); isFirstChunk = false }

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
                                } catch (e) { }
                            }
                        }
                    }

                    if (!assistantContent) throw new Error("Empty response")

                    const inputTokens = estimateTokens(newContent)
                    const outputTokens = estimateTokens(assistantContent)
                    updateApiKey(apiKey.id, { usage: (apiKey.usage || 0) + inputTokens + outputTokens })
                    updateMessage(assistantMsgId, assistantContent)
                    success = true
                    break

                } catch (innerError: any) {
                    clearTimeout(timeoutId)
                    if (innerError.name === 'AbortError') throw new Error(`Timeout ${timeoutDuration / 1000}s`)
                    throw innerError
                }

            } catch (error: any) {
                console.error(`Error with ${apiKey.provider}:`, error)
                lastError = error

                // LOCK LOGIC:
                const twentyFourHours = 24 * 60 * 60 * 1000
                updateApiKey(apiKey.id, {
                    rateLimitedUntil: Date.now() + twentyFourHours,
                    label: `${apiKey.label || apiKey.provider} (Locked 24h - Error)`
                })

                if (keysToTry.indexOf(apiKey) < keysToTry.length - 1) {
                    toast.warning(`Error with ${apiKey.provider}. Switching to...`, {
                        position: 'bottom-right'
                    })
                }
            }
        }

        if (!success) {
            const finalErrorMsg = lastError?.message || "Failed to regenerate."
            toast.error(finalErrorMsg)
            updateMessage(assistantMsgId, "Error: " + finalErrorMsg)
        }
        setLoading(false)
    }

    return {
        input,
        setInput,
        handleSubmit,
        handleRegenerate,
        handleEdit,
        isLoading,
        messages
    }
}
