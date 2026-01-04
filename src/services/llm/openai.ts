import { LLMProvider, Message, StreamChunk } from "./types"


export class OpenAIProvider implements LLMProvider {
    id = "openai"
    name = "OpenAI"
    private baseUrl: string
    private model: string
    private extraHeaders: Record<string, string> = {}

    constructor(config?: { baseUrl?: string; model?: string; id?: string; name?: string; headers?: Record<string, string> }) {
        this.baseUrl = config?.baseUrl || "https://api.openai.com/v1/chat/completions"
        this.model = config?.model || "gpt-3.5-turbo"
        if (config?.id) this.id = config.id
        if (config?.name) this.name = config.name
        if (config?.headers) this.extraHeaders = config.headers
    }



    async streamChat(
        messages: Message[],
        apiKey: string,
        onChunk: (chunk: StreamChunk) => void
    ): Promise<void> {
        try {
            // Intelligent Context Pruning: Keep System Prompt + Last 10 messages
            const systemMessage = messages.find(m => m.role === 'system')
            const recentMessages = messages.filter(m => m.role !== 'system').slice(-10)

            // Force English Rule:
            // Some models (Groq/DeepSeek) can default to Chinese. We enforce English here.
            const forcedSystemPrompt = {
                role: 'system',
                content: (systemMessage ? systemMessage.content + "\n\n" : "") +
                    "IMPORTANT RULE: You MUST always respond in English, regardless of the user's input language, unless explicitly asked to translate. Do not output Chinese."
            }

            const finalMessages = [forcedSystemPrompt, ...recentMessages]

            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    ...this.extraHeaders
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: finalMessages,
                    stream: true,
                }),
            })

            if (!response.ok) {
                const status = response.status
                const statusText = response.statusText
                let errorMessage = `OpenAI API Error: ${status} ${statusText}`

                try {
                    const error = await response.json()
                    // Handle "insufficient_quota" specifically if present
                    if (error.error?.code === 'insufficient_quota') {
                        errorMessage = "OpenAI Quota Exceeded"
                    } else if (error.error?.message) {
                        errorMessage = error.error.message
                    }
                } catch (e) {
                    const text = await response.text()
                    console.warn("[OpenAI Provider] Raw Error:", text) // Debug: Show raw error
                    if (text) errorMessage += ` - ${text.slice(0, 200)}`
                }

                throw new Error(errorMessage)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder("utf-8")

            if (!reader) throw new Error("No response body")

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split("\n").filter((line) => line.trim() !== "")

                for (const line of lines) {
                    if (line === "data: [DONE]") {
                        onChunk({ content: "", isDone: true })
                        return
                    }
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            const content = data.choices[0]?.delta?.content || ""
                            if (content) {
                                onChunk({
                                    content,
                                    isDone: false
                                })
                            }
                        } catch (e) {
                            // Ignore parse errors for partial/malformed lines
                            // This prevents "Unterminated string" crashes
                        }
                    }
                }
            }
        } catch (error: any) {
            console.warn("OpenAI Provider Error (Handled):", error.message)
            throw error
        }
    }
}
