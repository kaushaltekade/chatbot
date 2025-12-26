export interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface StreamChunk {
    content: string
    isDone: boolean
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
}

export interface LLMProvider {
    id: string
    name: string

    estimateTokens(text: string): number

    streamChat(
        messages: Message[],
        apiKey: string,
        onChunk: (chunk: StreamChunk) => void
    ): Promise<void>
}
