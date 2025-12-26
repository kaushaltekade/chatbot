import { NextRequest, NextResponse } from "next/server"
import { OpenAIProvider } from "@/services/llm/openai"

// Map of providers
const providers = {
    'openai': new OpenAIProvider(),
    // 'gemini': new GeminiProvider(),
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
        console.error("API Route Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
