import { LLMProvider, Message, StreamChunk } from "./types"
import { estimateTokens } from "@/lib/token-utils"

export class CohereProvider implements LLMProvider {
    id = "cohere"
    name = "Cohere"
    private baseUrl: string = "https://api.cohere.ai/v1/chat"
    private model: string

    constructor(config?: { model?: string; id?: string; name?: string }) {
        this.model = config?.model || "command-r-08-2024" // Using standard Command R for stability
        if (config?.id) this.id = config.id
        if (config?.name) this.name = config.name
    }

    estimateTokens(text: string): number {
        return estimateTokens(text)
    }

    async streamChat(
        messages: Message[],
        apiKey: string,
        onChunk: (chunk: StreamChunk) => void
    ): Promise<void> {
        try {
            // Cohere format: 
            // - "message": The latest user message
            // - "chat_history": Previous messages [{ role: "USER"|"CHATBOT", message: "..." }]

            const lastMessage = messages[messages.length - 1]
            if (!lastMessage || lastMessage.role !== 'user') {
                throw new Error("Last message must be from user")
            }

            // Convert history (excluding the last message which goes to 'message')
            const history = messages.slice(0, -1).map(m => ({
                role: m.role === 'user' ? 'USER' : 'CHATBOT',
                message: m.content
            }))

            // System prompt isn't directly supported in chat_history the same way, 
            // but we can prepend it or use 'preamble' if we want strict control. 
            // For now, if there is a system message, we can try to prepend or ignore. 
            // Command-R usually follows system prompts if they are the first user message or preamble.
            // Simplified: Just filter out system for chat_history, or map to CHATBOT? 
            // Better: Cohere supports 'preamble' field for system prompt.

            const systemMessage = messages.find(m => m.role === 'system')
            const chatHistory = history.filter(h => h.message && h.role) // Filter empty

            const body = {
                message: lastMessage.content,
                chat_history: chatHistory,
                model: this.model,
                stream: true,
                preamble: systemMessage ? systemMessage.content : undefined
            }

            console.log(`[Cohere] Sending request to ${this.model}...`)

            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    "Accept": "application/json"
                },
                body: JSON.stringify(body),
            })

            if (!response.ok) {
                const errorText = await response.text()
                let errorMsg = `Cohere API Error: ${response.status}`
                try {
                    const errorJson = JSON.parse(errorText)
                    if (errorJson.message) errorMsg = errorJson.message
                } catch (e) {
                    errorMsg += ` - ${errorText.slice(0, 100)}`
                }
                throw new Error(errorMsg)
            }

            if (!response.body) throw new Error("No response body")

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk

                const lines = buffer.split("\n")
                // Keep the last partial line in the buffer
                buffer = lines.pop() || ""

                for (const line of lines) {
                    if (!line.trim()) continue

                    try {
                        const data = JSON.parse(line)

                        // Check for error in stream
                        if (data.is_finished && data.finish_reason === 'ERROR') {
                            throw new Error("Cohere Stream Error: " + (data.text || "Unknown error"))
                        }

                        // Cohere streaming events: 'text-generation' contains the text chunk
                        if (data.event_type === 'text-generation') {
                            onChunk({
                                content: data.text,
                                isDone: false
                            })
                        } else if (data.event_type === 'stream-end') {
                            onChunk({ content: "", isDone: true })
                            return
                        }
                    } catch (e) {
                        // Likely a partial JSON line that shouldn't happen with correct buffering, 
                        // but safe to ignore if we trust the buffer logic.
                        console.warn("[Cohere] Parse error:", e)
                    }
                }
            }

        } catch (error: any) {
            console.warn("Cohere Provider Error:", error.message)
            throw error
        }
    }
}
