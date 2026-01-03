import { NextRequest, NextResponse } from "next/server"
import { OpenAIProvider } from "@/services/llm/openai"

import { GeminiProvider } from "@/services/llm/gemini"
import { CohereProvider } from "@/services/llm/cohere"
import { AnthropicProvider } from "@/services/llm/anthropic"

// Map of providers
const providers = {
    'openai': new OpenAIProvider(),
    'gemini': new GeminiProvider(),
    'deepseek': new OpenAIProvider({
        id: 'deepseek',
        name: 'DeepSeek V3 (Hyperbolic)',
        baseUrl: 'https://api.hyperbolic.xyz/v1/chat/completions',
        model: 'deepseek-ai/DeepSeek-V3'
    }),
    'groq': new OpenAIProvider({
        id: 'groq',
        name: 'Groq (Llama 3.3)',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile'
    }),
    'mistral': new OpenAIProvider({
        id: 'mistral',
        name: 'Mistral AI',
        baseUrl: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-large-latest'
    }),
    'perplexity': new OpenAIProvider({
        id: 'perplexity',
        name: 'Perplexity (Smart Search)',
        baseUrl: 'https://api.perplexity.ai/chat/completions',
        model: 'sonar-pro' // Intelligent, research-focused (slower)
    }),
    'perplexity-chat': new OpenAIProvider({
        id: 'perplexity-chat',
        name: 'Perplexity (Fast)',
        baseUrl: 'https://api.perplexity.ai/chat/completions',
        model: 'sonar' // Lightweight, low-latency (faster)
    }),
    'together': new OpenAIProvider({
        id: 'together',
        name: 'Together AI',
        baseUrl: 'https://api.together.xyz/v1/chat/completions',
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
    }),
    'openrouter': new OpenAIProvider({
        id: 'openrouter',
        name: 'OpenRouter (Heimdal Free)',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'heimdal/heimdal-3b:free',
        headers: {
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AAAOP"
        }
    }),
    'anthropic': new AnthropicProvider(),
    'cohere': new CohereProvider({ model: 'command-r-plus-08-2024' }),
}

export async function POST(req: NextRequest) {
    try {
        const { messages, providerId, apiKey } = await req.json()

        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 401 })
        }

        const provider = providers[providerId as keyof typeof providers]
        if (!provider) {
            return NextResponse.json({ error: "Invalid Provider" }, { status: 400 })
        }

        // Set up streaming response
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    await provider.streamChat(messages, apiKey, (chunk) => {
                        const data = JSON.stringify(chunk)
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                    })
                    controller.close()
                } catch (error: any) {
                    controller.error(error)
                }
            },
        })

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        })

    } catch (error: any) {
        // Log as warning to avoid scary red text in terminal for expected errors (like quota exhausted)
        console.warn("API Route Error (Handled):", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
