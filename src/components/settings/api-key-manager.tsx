"use client"

import { useState } from "react"
import { useChatStore, type AIProvider } from "@/store/chat-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Eye, EyeOff } from "lucide-react"
import { cn, generateId } from "@/lib/utils"
import { useMounted } from "@/hooks/use-mounted"

const PROVIDERS: { value: AIProvider; label: string }[] = [
    { value: "openai", label: "OpenAI" },
    { value: "gemini", label: "Google Gemini" },
    { value: "deepseek", label: "DeepSeek" },
    { value: "anthropic", label: "Anthropic" },
    { value: "groq", label: "Groq" },
    { value: "mistral", label: "Mistral" },
]

export function ApiKeyManager() {
    const { apiKeys, addApiKey, updateApiKey, deleteApiKey, setApiKeys } = useChatStore()
    const mounted = useMounted()

    // Prevent hydration mismatch
    const displayKeys = mounted ? apiKeys : []

    // Auto-Cleanup: Remove duplicate IDs caused by previous bug
    // This fixes React render issues and "ghost" keys
    useState(() => {
        if (!mounted) return

        const seen = new Set()
        const uniqueKeys: import("@/store/chat-store").ApiKey[] = []
        let hasDuplicates = false

        // We read directly from store state to avoid dependency loops if we relied on the hook's return
        const currentKeys = useChatStore.getState().apiKeys

        currentKeys.forEach(k => {
            if (!seen.has(k.id)) {
                seen.add(k.id)
                uniqueKeys.push(k)
            } else {
                hasDuplicates = true
            }
        })

        if (hasDuplicates) {
            console.log("Cleaning up duplicate keys...")
            useChatStore.getState().setApiKeys(uniqueKeys)
        }
    })

    const [newKey, setNewKey] = useState("")
    const [newLimit, setNewLimit] = useState(0)
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>("openai")
    const [showKey, setShowKey] = useState<Record<string, boolean>>({})

    const handleAddKey = () => {
        if (!newKey) return
        addApiKey({
            id: generateId(),
            provider: selectedProvider,
            key: newKey,
            usage: 0,
            limit: newLimit,
            isActive: true,
            label: `${PROVIDERS.find(p => p.value === selectedProvider)?.label} Key`
        })
        setNewKey("")
        setNewLimit(0)
        // toast.success("API Key added")
    }

    const toggleShowKey = (id: string) => {
        setShowKey(prev => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>API Key Management</CardTitle>
                <CardDescription>
                    Manage your API keys for different providers. Keys are stored locally in your browser.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-4 items-end">
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Provider</label>
                        <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as AIProvider)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PROVIDERS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        {p.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 flex-[2]">
                        <label className="text-sm font-medium">API Key</label>
                        <Input
                            type="password"
                            placeholder="sk-..."
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 w-24">
                        <label className="text-sm font-medium">Limit</label>
                        <Input
                            type="number"
                            placeholder="∞"
                            className="px-2"
                            value={newLimit === 0 ? "" : newLimit} // Display empty for 0, otherwise value
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                setNewLimit(isNaN(value) || value < 0 ? 0 : value);
                            }}
                        />
                    </div>
                    <Button onClick={handleAddKey}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Key
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Provider</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayKeys.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                        {mounted ? "No API keys added yet." : "Loading keys..."}
                                    </TableCell>
                                </TableRow>
                            )}
                            {displayKeys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium capitalize">
                                        <div className="flex flex-col">
                                            <span>{key.provider}</span>
                                            {key.label && key.label !== key.provider && (
                                                <span className="text-xs text-muted-foreground">{key.label}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            {showKey[key.id] ? key.key : "•".repeat(20) + key.key.slice(-4)}
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleShowKey(key.id)}>
                                                {showKey[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 min-w-[150px]">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{key.usage.toLocaleString()} used</span>
                                                {key.limit && key.limit > 0 ? (
                                                    <span>{((key.usage / key.limit) * 100).toFixed(0)}%</span>
                                                ) : (
                                                    <span>∞</span>
                                                )}
                                            </div>
                                            {key.limit && key.limit > 0 ? (
                                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full transition-all",
                                                            (key.usage / key.limit) > 0.9 ? "bg-red-500" :
                                                                (key.usage / key.limit) > 0.7 ? "bg-yellow-500" : "bg-green-500"
                                                        )}
                                                        style={{ width: `${Math.min((key.usage / key.limit) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500 w-full opacity-20" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {(key.rateLimitedUntil && key.rateLimitedUntil > Date.now()) ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-red-500">Locked</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2"
                                                        onClick={() => updateApiKey(key.id, { rateLimitedUntil: undefined, isActive: true })}
                                                    >
                                                        Unlock
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant={key.isActive ? "default" : "secondary"}
                                                    size="sm"
                                                    className={cn("h-6 text-[10px] px-2", key.isActive ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground")}
                                                    onClick={() => updateApiKey(key.id, { isActive: !key.isActive })}
                                                >
                                                    {key.isActive ? "Enabled" : "Disabled"}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => deleteApiKey(key.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
