import { LLMProvider, Message, StreamChunk } from "./types"
import { estimateTokens } from "@/lib/token-utils"

export class AnthropicProvider implements LLMProvider {
    id = "anthropic"
    name = "Anthropic"
    private baseUrl: string = "https://api.anthropic.com/v1/messages"
    private model: string

    constructor(config?: { model?: string; id?: string; name?: string }) {
        this.model = config?.model || "claude-3-5-sonnet-20240620"
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
            const systemMessage = messages.find(m => m.role === 'system')

            // Filter and map messages. Anthropic Strictness: 
            // 1. Roles must be user/assistant alternating (usually).
            // 2. No system role in `messages` array.

            const conversationMessages = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role,
                    content: m.content
                }))

            const body: any = {
                model: this.model,
                messages: conversationMessages,
                stream: true,
                max_tokens: 4096,
            }

            if (systemMessage) {
                body.system = systemMessage.content
            }

            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify(body),
            })

            if (!response.ok) {
                const errorText = await response.text()
                let errorMsg = `Anthropic API Error: ${response.status}`
                try {
                    const errorJson = JSON.parse(errorText)
                    if (errorJson.error?.message) errorMsg = errorJson.error.message
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
                buffer = lines.pop() || ""

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || !trimmed.startsWith("data: ")) continue

                    const dataStr = trimmed.slice(6) // Remove "data: "
                    if (dataStr === "[DONE]") return

                    try {
                        const data = JSON.parse(dataStr)

                        // Anthropic SSE Events
                        if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                            onChunk({
                                content: data.delta.text,
                                isDone: false
                            })
                        } else if (data.type === 'message_stop') {
                            onChunk({ content: "", isDone: true })
                            return
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        } catch (error: any) {
            console.warn("Anthropic Provider Error:", error.message)
            throw error
        }
    }
}
