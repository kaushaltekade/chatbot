"use client"

import { useChatStore } from "@/store/chat-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Bot } from "lucide-react"

export function SystemPromptSettings() {
    const { systemPrompt, setSystemPrompt } = useChatStore()

    return (
        <Card className="w-full max-w-4xl mx-auto border-purple-200 dark:border-purple-900/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-600" />
                    System Prompt
                </CardTitle>
                <CardDescription>
                    Define a global personality or set of instructions for the AI. This will be sent as a "system" message at the start of every conversation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid w-full gap-2">
                    <Label htmlFor="system-prompt">Custom Instructions</Label>
                    <Textarea
                        id="system-prompt"
                        placeholder="e.g. You are a senior React developer. Always answer with code examples."
                        className="min-h-[150px] font-mono text-sm"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Changes are saved automatically and will apply to the next message you send.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
