import { LLMProvider, Message, StreamChunk } from "./types"
import { estimateTokens } from "@/lib/token-utils"

export class GeminiProvider implements LLMProvider {
    id = "gemini"
    name = "Google Gemini"

    estimateTokens(text: string): number {
        return estimateTokens(text)
    }

    async streamChat(
        messages: Message[],
        apiKey: string,
        onChunk: (chunk: StreamChunk) => void
    ): Promise<void> {
        try {
            // Convert messages to Gemini format
            // Gemini uses "user" and "model" roles
            const contents = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }))

            // Handle system prompt if present (Gemini 1.5 supports system_instruction)
            const systemMessage = messages.find(m => m.role === 'system')
            const systemInstruction = systemMessage
                ? { parts: [{ text: systemMessage.content }] }
                : undefined

            // Use gemini-1.5-flash-latest which is often more reliable for alias resolution or gemini-pro
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents,
                        system_instruction: systemInstruction,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2048,
                        },
                    }),
                }
            )

            if (!response.ok) {
                const error = await response.json()
                console.error("Gemini API Raw Error:", JSON.stringify(error, null, 2))
                throw new Error(error.error?.message || "Gemini API Error")
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder("utf-8")

            if (!reader) throw new Error("No response body")

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                this.processBuffer(chunk, onChunk)
            }
        } catch (error) {
            console.error("Gemini Provider Error:", error)
            throw error
        }
    }

    private buffer = ""

    private processBuffer(chunk: string, onChunk: (chunk: StreamChunk) => void) {
        this.buffer += chunk

        // Basic manual parsing of the JSON stream from Google
        // Google sends [ { ... }, { ... } ] or similar in chunks
        // But often split arbitrarily.

        let startIndex = 0
        while (true) {
            // Look for a candidate object that has "candidates" field
            // A simple heuristic: look for "text" within "parts" within "candidates"??
            // Actually, we just need to find valid JSON objects representing the response chunks.
            // But we have to handle the surrounding [] if present.

            // Clean up initial array bracket if it's the very first chunk often
            if (this.buffer.trim().startsWith('[')) {
                const firstBracket = this.buffer.indexOf('[')
                if (firstBracket !== -1) {
                    // We don't remove it from buffer permanently, just ignore it for parsing??
                    // Actually, usually it's cleaner to just parse complete objects { ... }
                    // The array format is [ {...}, \n {...} ]
                }
            }

            const openBrace = this.buffer.indexOf('{', startIndex)
            if (openBrace === -1) break

            let balance = 0
            let closeBrace = -1
            for (let i = openBrace; i < this.buffer.length; i++) {
                if (this.buffer[i] === '{') balance++
                if (this.buffer[i] === '}') {
                    balance--
                    if (balance === 0) {
                        closeBrace = i
                        break
                    }
                }
            }

            if (closeBrace !== -1) {
                const jsonStr = this.buffer.slice(openBrace, closeBrace + 1)
                try {
                    const data = JSON.parse(jsonStr)
                    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
                    if (content) {
                        onChunk({ content, isDone: false })
                    }
                } catch (e) {
                    // Ignore parse error
                }

                startIndex = closeBrace + 1
            } else {
                break // Wait for more data
            }
        }

        this.buffer = this.buffer.slice(startIndex)
    }
}
