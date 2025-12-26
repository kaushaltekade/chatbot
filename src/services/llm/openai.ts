import { LLMProvider, Message, StreamChunk } from "./types"
import { estimateTokens } from "@/lib/token-utils"

export class OpenAIProvider implements LLMProvider {
    id = "openai"
    name = "OpenAI"

    estimateTokens(text: string): number {
        return estimateTokens(text)
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
            const finalMessages = systemMessage ? [systemMessage, ...recentMessages] : recentMessages

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: finalMessages,
                    stream: true,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error?.message || "OpenAI API Error")
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
                        const data = JSON.parse(line.slice(6))
                        const content = data.choices[0]?.delta?.content || ""
                        if (content) {
                            onChunk({
                                content,
                                isDone: false
                            })
                        }
                    }
                }
            }
        } catch (error) {
            console.error("OpenAI Provider Error:", error)
            throw error
        }
    }
}
