
import { useState, useEffect, useRef } from "react"
import { useChatStore, Message } from "@/store/chat-store"
import { generateId } from "@/lib/utils"
import { toast } from "sonner"



export function useChatStream(conversationId?: string) {
    const {
        messages: globalMessages, // Renamed to avoid conflict with local 'messages'
        conversations,
        addMessage,
        updateMessage,
        deleteMessage,
        setLoading: setStoreLoading, // Rename to avoid conflict with local setLoading
        updateApiKey,
        createConversation,
        apiKeys, // Moved here
        activeConversationId: globalActiveId, // Renamed
        updateConversationTitle,
        smartRoutingEnabled, // Added
        systemPrompt // Added
    } = useChatStore()

    // Resolve effective ID: explicit prop > global active ID
    // If neither exists, we are in a "new chat" state effectively
    const activeId = conversationId || globalActiveId || undefined

    // Filter messages for this specific conversation
    // If no activeId, we show empty list (or if strictly new chat)
    const messages = activeId
        ? conversations.find(c => c.id === activeId)?.messages || []
        : []

    const [isLoading, setLoading] = useState(false)
    const abortControllerRef = useRef<AbortController | null>(null)

    const stop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setLoading(false)
            setStoreLoading(false) // Also update store's loading state
            toast.info("Generation stopped")
        }
    }

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
        // const { smartRoutingEnabled } = useChatStore.getState() // Removed, now directly from store
        const now = Date.now()
        let activeKeys = apiKeys.filter(k => { // apiKeys is now directly available
            if (!k.isActive) return false
            if (k.rateLimitedUntil && k.rateLimitedUntil > now) return false
            return true
        })

        if (!smartRoutingEnabled) { // Use directly
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

    const checkAndResetUsage = (apiKey: typeof apiKeys[0]) => {
        const now = Date.now()
        // Reset if last reset provided and > 24 hours ago, OR if never reset
        // Actually, if never reset, we might want to start tracking now, but not wipe existing? 
        // User asked for "show how much token is there but show this information in day like 24 hour after reset".
        // Let's assume on first run with this code, if lastUsageReset is undefined, we simply set it to now and keep usage (or reset? safe to keep).
        // If we want a strict "daily usage", we should probably reset if it's undefined to start clean or just set the timestamp.
        // Let's set timestamp if missing, but reset if > 24h.

        if (!apiKey.lastUsageReset) {
            updateApiKey(apiKey.id, { lastUsageReset: now })
            return apiKey.usage || 0 // Don't wipe legacy usage immediately, just start timer
        }

        const oneDay = 24 * 60 * 60 * 1000
        if (now - apiKey.lastUsageReset > oneDay) {
            // It's been more than 24h, reset usage
            updateApiKey(apiKey.id, { lastUsageReset: now, usage: 0 })
            return 0
        }
        return apiKey.usage || 0
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim()) return

        const keysToTry = getOrderedKeys(input)

        if (keysToTry.length === 0) {
            const msg = "No active API keys found (compatible with request). Please check Settings."
            toast.error(msg)
            return
        }

        // 1. Ensure Conversation Exists
        // Use the resolved activeId. If null, create one.
        let effectiveConversationId = activeId
        let isNewConversation = false

        if (!effectiveConversationId) {
            // Note: createConversation currently updates global activeId.
            // If we are in a split pane with no ID, this might affect global state.
            // For now, accept that creating a chat makes it global active.
            createConversation()
            effectiveConversationId = useChatStore.getState().activeConversationId || undefined
            isNewConversation = true
        }

        if (!effectiveConversationId) return // Should not happen

        // 2. Auto-Title if it's the first message (or new conversation)
        // We check if messages are empty OR if we just created it.
        // Use the local 'messages' derived from activeId
        if (isNewConversation || messages.length === 0) {
            const title = input.slice(0, 30) + (input.length > 30 ? "..." : "") || "Image Upload"
            updateConversationTitle(effectiveConversationId, title)
        }

        const userMsg: Message = {
            id: generateId(),
            role: "user",
            content: input,
        }

        // @ts-ignore - addMessage needs to be updated to accept conversationId
        addMessage(userMsg, effectiveConversationId)
        setInput("")
        setLoading(true)

        // Initial Assistant Message placeholder
        let assistantMsgId = generateId()
        // @ts-ignore - addMessage needs to be updated to accept conversationId
        addMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            tokens: 0
        }, effectiveConversationId)

        let lastError: Error | null = null
        let success = false

        for (const apiKey of keysToTry) {
            try {
                // Usage Reset Check
                const currentUsage = checkAndResetUsage(apiKey)

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
                    // Abort previous if any
                    if (abortControllerRef.current) abortControllerRef.current.abort()
                    const ac = new AbortController()
                    abortControllerRef.current = ac

                    const response = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            messages: [
                                ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []), // Use directly
                                ...messages.map(m => ({ role: m.role, content: m.content })), // Use local 'messages'
                                { role: userMsg.role, content: userMsg.content } // Add the user message we just sent
                            ],
                            providerId: apiKey.provider,
                            apiKey: apiKey.key
                        }),
                        signal: ac.signal
                    })

                    if (!response.ok) {
                        const err = await response.json()
                        throw new Error(err.error || `Failed to fetch response from ${apiKey.provider} `)
                    }

                    if (!response.body) throw new Error("No response body")

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()
                    let assistantContent = ""
                    let isFirstChunk = true

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

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
                                        // @ts-ignore - updateMessage needs to be updated to accept conversationId
                                        updateMessage(assistantMsgId, assistantContent, apiKey.provider, effectiveConversationId)
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


                    // @ts-ignore - updateMessage needs to be updated to accept conversationId
                    updateMessage(assistantMsgId, assistantContent, apiKey.provider, effectiveConversationId)
                    success = true
                    break // Stop loop on success

                } catch (innerError: any) {
                    clearTimeout(timeoutId)
                    if (innerError.name === 'AbortError') {
                        throw new Error(`Connection timed out after ${timeoutDuration / 1000} s`)
                    }
                    throw innerError
                }

            } catch (error: any) {
                console.error(`Error with ${apiKey.provider}: `, error)
                lastError = error

                const twentyFourHours = 24 * 60 * 60 * 1000
                updateApiKey(apiKey.id, {
                    rateLimitedUntil: Date.now() + twentyFourHours,
                    label: `${apiKey.label || apiKey.provider} (Locked 24h - Error)`
                })

                if (keysToTry.indexOf(apiKey) < keysToTry.length - 1) {
                    const nextProvider = keysToTry[keysToTry.indexOf(apiKey) + 1].provider

                    // Cleanup failed message
                    // @ts-ignore - deleteMessage needs to be updated to accept conversationId
                    deleteMessage(assistantMsgId, effectiveConversationId)
                    assistantMsgId = generateId()
                    // @ts-ignore - addMessage needs to be updated to accept conversationId
                    addMessage({
                        id: assistantMsgId,
                        role: "assistant",
                        content: "",
                        tokens: 0
                    }, effectiveConversationId)

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
            // @ts-ignore - updateMessage needs to be updated to accept conversationId
            updateMessage(assistantMsgId, "Error: " + finalErrorMsg, undefined, effectiveConversationId)
        }

        setLoading(false)
    }

    const handleRegenerate = async () => {
        // Use local 'messages'
        if (messages.length === 0) return

        const lastMessage = messages[messages.length - 1]

        // Ensure last message is from assistant
        if (lastMessage.role !== 'assistant') return

        // 1. Delete the last assistant message
        // @ts-ignore - deleteMessage needs to be updated to accept conversationId
        deleteMessage(lastMessage.id, activeId)

        // 2. Find the last user message to use as prompt
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')

        if (!lastUserMsg) return

        setLoading(true)

        // Check for images in the LAST USER MESSAGE
        const keysToTry = getOrderedKeys(lastUserMsg.content)

        if (keysToTry.length === 0) {
            toast.error("No active API keys found.")
            setLoading(false)
            return
        }

        // Placeholder for new response
        let assistantMsgId = generateId()
        // @ts-ignore - addMessage needs to be updated to accept conversationId
        addMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            tokens: 0
        }, activeId)

        let lastError: Error | null = null
        let success = false

        // We act on the history WITHOUT the just-deleted assistant message
        // Use the local 'messages' and slice it
        const historyForRegen = messages.slice(0, -1)

        for (const apiKey of keysToTry) {
            try {
                checkAndResetUsage(apiKey)
                if (lastError) toast.warning(`Switching to ${apiKey.provider}...`)

                const isFirstTry = keysToTry.indexOf(apiKey) === 0
                const timeoutDuration = (apiKey.provider === 'perplexity' || apiKey.provider === 'cohere') ? 30000 : (isFirstTry ? 5000 : 20000)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

                try {
                    if (abortControllerRef.current) abortControllerRef.current.abort()
                    const ac = new AbortController()
                    abortControllerRef.current = ac

                    const response = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            messages: [
                                ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []), // Use directly
                                ...historyForRegen.map(m => ({ role: m.role, content: m.content }))
                            ],
                            providerId: apiKey.provider,
                            apiKey: apiKey.key
                        }),
                        signal: ac.signal
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
                                        // @ts-ignore - updateMessage needs to be updated to accept conversationId
                                        updateMessage(assistantMsgId, assistantContent, undefined, activeId)
                                    }
                                } catch (e) { }
                            }
                        }
                    }

                    if (!assistantContent) throw new Error("Empty response")



                    // @ts-ignore - updateMessage needs to be updated to accept conversationId
                    updateMessage(assistantMsgId, assistantContent, apiKey.provider, activeId)
                    success = true
                    break

                } catch (innerError: any) {
                    clearTimeout(timeoutId)
                    if (innerError.name === 'AbortError') throw new Error(`Timeout ${timeoutDuration / 1000} s`)
                    throw innerError
                }

            } catch (error: any) {
                console.error(`Error with ${apiKey.provider}: `, error)
                lastError = error
                const twentyFourHours = 24 * 60 * 60 * 1000
                updateApiKey(apiKey.id, {
                    rateLimitedUntil: Date.now() + twentyFourHours,
                    label: `${apiKey.label || apiKey.provider} (Locked 24h - Error)`
                })
                if (keysToTry.indexOf(apiKey) < keysToTry.length - 1) {
                    toast.warning(`Error with ${apiKey.provider}. Switching to...`, { position: 'bottom-right' })
                }
            }
        }

        if (!success) {
            const finalErrorMsg = lastError?.message || "Failed to regenerate."
            toast.error(finalErrorMsg)
            // @ts-ignore - updateMessage needs to be updated to accept conversationId
            updateMessage(assistantMsgId, "Error: " + finalErrorMsg, undefined, activeId)
        }
        setLoading(false)
    }

    const handleEdit = async (messageId: string, newContent: string) => {
        // Use local 'messages'
        const msgIndex = messages.findIndex(m => m.id === messageId)

        if (msgIndex === -1) return

        // 1. Truncate history
        const newHistory = messages.slice(0, msgIndex + 1)
        // 2. Update content
        newHistory[msgIndex] = { ...newHistory[msgIndex], content: newContent }

        // 3. Update Store
        // This part needs to be careful. If activeId is not globalActiveId,
        // directly setting state.messages might not be correct.
        // The store's updateConversation should handle this.
        useChatStore.setState(state => {
            const updatedConversations = state.conversations.map(c =>
                c.id === activeId // Use activeId here
                    ? { ...c, messages: newHistory, lastUpdated: Date.now() }
                    : c
            )
            // If the activeId is the global one, also update state.messages for consistency
            // Otherwise, only update the specific conversation's messages
            return {
                ...state,
                messages: state.activeConversationId === activeId ? newHistory : state.messages,
                conversations: updatedConversations
            }
        })

        // 4. Trigger submission
        setLoading(true)

        // Check if the edited message had images
        const keysToTry = getOrderedKeys(newContent)

        if (keysToTry.length === 0) {
            toast.error("No active API keys found.")
            setLoading(false)
            return
        }

        let assistantMsgId = generateId()
        // @ts-ignore - addMessage needs to be updated to accept conversationId
        addMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            tokens: 0
        }, activeId)

        let lastError: Error | null = null
        let success = false
        const historyForApi = newHistory

        for (const apiKey of keysToTry) {
            try {
                checkAndResetUsage(apiKey)
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
                            // Construct messages with System Prompt
                            messages: [
                                ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []), // Use directly
                                ...historyForApi.map(m => ({ role: m.role, content: m.content }))
                            ],
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
                                        // @ts-ignore - updateMessage needs to be updated to accept conversationId
                                        updateMessage(assistantMsgId, assistantContent, undefined, activeId)
                                    }
                                } catch (e) { }
                            }
                        }
                    }

                    if (!assistantContent) throw new Error("Empty response")

                    if (!assistantContent) throw new Error("Empty response")


                    // @ts-ignore - updateMessage needs to be updated to accept conversationId
                    updateMessage(assistantMsgId, assistantContent, apiKey.provider, activeId)
                    success = true
                    break

                } catch (innerError: any) {
                    clearTimeout(timeoutId)
                    if (innerError.name === 'AbortError') throw new Error(`Timeout ${timeoutDuration / 1000} s`)
                    throw innerError
                }

            } catch (error: any) {
                console.error(`Error with ${apiKey.provider}: `, error)
                lastError = error
                const twentyFourHours = 24 * 60 * 60 * 1000
                updateApiKey(apiKey.id, {
                    rateLimitedUntil: Date.now() + twentyFourHours,
                    label: `${apiKey.label || apiKey.provider} (Locked 24h - Error)`
                })
                if (keysToTry.indexOf(apiKey) < keysToTry.length - 1) {
                    toast.warning(`Error with ${apiKey.provider}. Switching to...`, { position: 'bottom-right' })
                }
            }
        }

        if (!success) {
            const finalErrorMsg = lastError?.message || "Failed to regenerate."
            toast.error(finalErrorMsg)
            // @ts-ignore - updateMessage needs to be updated to accept conversationId
            updateMessage(assistantMsgId, "Error: " + finalErrorMsg, undefined, activeId)
        }
        setLoading(false)
    }

    return {
        input,
        setInput,
        handleSubmit,
        handleRegenerate,
        handleEdit,
        stop,
        isLoading,
        messages // Return the filtered messages
    }
}

