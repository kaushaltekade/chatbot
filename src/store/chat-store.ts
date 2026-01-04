import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'anthropic' | 'groq' | 'mistral' | 'cohere' | 'huggingface' | 'openrouter' | 'perplexity' | 'perplexity-chat' | 'together'

export interface ApiKey {
    id: string
    provider: AIProvider
    key: string
    usage: number
    limit?: number
    lastUsageReset?: number // Timestamp of last usage reset
    rateLimitedUntil?: number
    isActive: boolean
    label?: string
}

export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    tokens?: number
    provider?: string
}

export interface Conversation {
    id: string
    title: string
    messages: Message[]
    lastUpdated: number
    isPinned?: boolean
}

interface ChatStore {
    apiKeys: ApiKey[]
    setApiKeys: (keys: ApiKey[]) => void
    reorderApiKeys: (keys: ApiKey[]) => void
    addApiKey: (key: ApiKey) => void
    updateApiKey: (id: string, updates: Partial<ApiKey>) => void
    deleteApiKey: (id: string) => void

    // Chat State
    conversations: Conversation[]
    activeConversationId: string | null
    messages: Message[]
    isLoading: boolean

    // Actions
    createConversation: () => void
    deleteConversation: (id: string) => void
    toggleConversationPin: (id: string) => void
    updateConversationTitle: (id: string, title: string) => void
    selectConversation: (id: string) => void
    addMessage: (message: Message) => void
    updateMessage: (id: string, content: string, provider?: string) => void
    deleteMessage: (id: string) => void
    setLoading: (loading: boolean) => void

    // Basic UI state
    isSidebarOpen: boolean
    toggleSidebar: () => void

    // Artifact State
    isArtifactOpen: boolean
    activeArtifactTab: "code" | "preview"
    artifactContent: string | null
    toggleArtifact: () => void
    setArtifactContent: (content: string) => void
    openArtifact: (content: string) => void

    // PREFERENCES
    smartRoutingEnabled: boolean
    toggleSmartRouting: () => void
    systemPrompt: string
    setSystemPrompt: (prompt: string) => void

    setActiveArtifactTab: (tab: "code" | "preview") => void
    isArtifactFullscreen: boolean
    setIsArtifactFullscreen: (min: boolean) => void

    // Data Management
    clearAllData: () => void
    syncWithSupabase: () => Promise<void> // Force sync
}

// Helpers for Supabase DB
async function upsertConversationToDB(conversation: Conversation) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
        .from('conversations')
        .upsert({
            id: conversation.id,
            user_id: user.id,
            title: conversation.title,
            last_updated: new Date(conversation.lastUpdated).toISOString(),
            is_pinned: conversation.isPinned || false
        })
    if (error) console.error("Failed to sync conversation:", error)
}

async function deleteConversationFromDB(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('conversations').delete().eq('id', id)
}

async function upsertMessageToDB(message: Message, conversationId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
        .from('messages')
        .upsert({
            id: message.id,
            conversation_id: conversationId,
            role: message.role,
            content: message.content,
            tokens: message.tokens
        })
    if (error) console.error("Failed to sync message:", error)
}

async function deleteMessageFromDB(messageId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('messages').delete().eq('id', messageId)
}

async function upsertApiKeyToDB(key: ApiKey) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
        .from('api_keys')
        .upsert({
            id: key.id,
            user_id: user.id,
            provider: key.provider,
            key_value: key.key,
            usage: key.usage,
            limit: key.limit,
            label: key.label,
            is_active: key.isActive,
        })
    if (error) console.error("Failed to sync api_key:", error)
}

async function deleteApiKeyFromDB(keyId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('api_keys').delete().eq('id', keyId)
}

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
            apiKeys: [],
            setApiKeys: (keys) => set({ apiKeys: keys }),
            reorderApiKeys: (keys: ApiKey[]) => set({ apiKeys: keys }),
            addApiKey: (key) => set((state) => {
                const exists = state.apiKeys.some(k => k.id === key.id)
                if (exists) {
                    const updatedKeys = state.apiKeys.map(k => k.id === key.id ? key : k)
                    upsertApiKeyToDB(key)
                    return { apiKeys: updatedKeys }
                }
                upsertApiKeyToDB(key)
                return { apiKeys: [...state.apiKeys, key] }
            }),
            updateApiKey: (id, updates) =>
                set((state) => {
                    const updatedKeys = state.apiKeys.map((k) => (k.id === id ? { ...k, ...updates } : k))
                    const updatedKey = updatedKeys.find(k => k.id === id)
                    if (updatedKey) upsertApiKeyToDB(updatedKey)
                    return { apiKeys: updatedKeys }
                }),
            deleteApiKey: (id) =>
                set((state) => {
                    deleteApiKeyFromDB(id)
                    return { apiKeys: state.apiKeys.filter((k) => k.id !== id) }
                }),

            // Chat Implementation
            conversations: [],
            activeConversationId: null,
            messages: [],
            isLoading: false,

            createConversation: () => {
                const newConv: Conversation = {
                    id: generateId(),
                    title: "New Chat",
                    messages: [],
                    lastUpdated: Date.now()
                }
                set(state => ({
                    conversations: [newConv, ...state.conversations],
                    activeConversationId: newConv.id,
                    messages: []
                }))
                upsertConversationToDB(newConv)
            },
            toggleConversationPin: (id) => {
                set(state => {
                    const updatedConversations = state.conversations.map(c =>
                        c.id === id ? { ...c, isPinned: !c.isPinned } : c
                    )
                    const conv = updatedConversations.find(c => c.id === id)
                    if (conv) upsertConversationToDB(conv)
                    return { conversations: updatedConversations }
                })
            },
            deleteConversation: (id) => {
                set(state => {
                    const newConversations = state.conversations.filter(c => c.id !== id)
                    // If active was deleted, select next best or create new
                    let newActiveId = state.activeConversationId
                    if (state.activeConversationId === id) {
                        newActiveId = newConversations.length > 0 ? newConversations[0].id : null
                    }

                    deleteConversationFromDB(id)

                    return {
                        conversations: newConversations,
                        activeConversationId: newActiveId,
                        messages: newActiveId ? (newConversations.find(c => c.id === newActiveId)?.messages || []) : []
                    }
                })
            },
            updateConversationTitle: (id, title) => {
                set(state => {
                    const updatedConversations = state.conversations.map(c =>
                        c.id === id ? { ...c, title } : c
                    )
                    const conv = updatedConversations.find(c => c.id === id)
                    if (conv) upsertConversationToDB(conv)
                    return { conversations: updatedConversations }
                })
            },
            selectConversation: (id) => {
                set(state => ({
                    activeConversationId: id,
                    messages: state.conversations.find(c => c.id === id)?.messages || []
                }))
            },
            addMessage: (message) => {
                set(state => {
                    const newMessages = [...state.messages, message]
                    const updatedConversations = state.conversations.map(c =>
                        c.id === state.activeConversationId
                            ? { ...c, messages: newMessages, lastUpdated: Date.now() }
                            : c
                    )

                    // Sync to DB
                    if (state.activeConversationId) {
                        upsertMessageToDB(message, state.activeConversationId)
                        const conv = updatedConversations.find(c => c.id === state.activeConversationId)
                        if (conv) upsertConversationToDB(conv)
                    }

                    return { messages: newMessages, conversations: updatedConversations }
                })
            },
            updateMessage: (id, content, provider) => {
                set(state => {
                    const newMessages = state.messages.map(m =>
                        m.id === id ? { ...m, content, ...(provider ? { provider } : {}) } : m
                    )
                    const updatedConversations = state.conversations.map(c =>
                        c.id === state.activeConversationId
                            ? { ...c, messages: newMessages }
                            : c
                    )

                    const msg = newMessages.find(m => m.id === id)
                    if (msg && state.activeConversationId) {
                        upsertMessageToDB(msg, state.activeConversationId)
                    }

                    return { messages: newMessages, conversations: updatedConversations }
                })
            },
            deleteMessage: (id) => {
                set(state => {
                    const newMessages = state.messages.filter(m => m.id !== id)
                    const updatedConversations = state.conversations.map(c =>
                        c.id === state.activeConversationId
                            ? { ...c, messages: newMessages }
                            : c
                    )

                    deleteMessageFromDB(id)

                    return { messages: newMessages, conversations: updatedConversations }
                })
            },
            setLoading: (loading) => set({ isLoading: loading }),

            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

            isArtifactOpen: false,
            activeArtifactTab: "preview",
            artifactContent: null,
            toggleArtifact: () => set((state) => ({
                isArtifactOpen: !state.isArtifactOpen,
                isArtifactFullscreen: false // Always exit fullscreen when toggling/closing
            })),
            setArtifactContent: (content) => set({ artifactContent: content }),
            openArtifact: (content) => set({ artifactContent: content, isArtifactOpen: true }),
            setActiveArtifactTab: (tab) => set({ activeArtifactTab: tab }),
            isArtifactFullscreen: false,
            setIsArtifactFullscreen: (val) => set({ isArtifactFullscreen: val }),

            clearAllData: () => set({
                apiKeys: [],
                conversations: [],
                messages: [],
                activeConversationId: null,
                isLoading: false
            }),

            syncWithSupabase: async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // Fetch API Keys
                const { data: keys, error: keyError } = await supabase
                    .from('api_keys')
                    .select('*')
                    .eq('user_id', user.id)

                if (keyError) console.error("Error fetching keys:", keyError)

                const remoteKeys: ApiKey[] = keys?.map((k: any) => ({
                    id: k.id,
                    provider: k.provider as AIProvider,
                    key: k.key_value,
                    usage: k.usage,
                    limit: k.limit,
                    isActive: k.is_active,
                    label: k.label
                })) || []

                // Fetch Conversations
                const { data: convs, error: convError } = await supabase
                    .from('conversations')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('last_updated', { ascending: false })

                if (convError) {
                    console.error("Error fetching conversations:", convError)
                    return
                }

                // For each conversation, fetch messages (this is a bit heavy, optimization would be to load only active or lazy load)
                // For now, let's load all to be synced with local Store style
                const loadedConversations: Conversation[] = []

                for (const c of convs) {
                    const { data: msgs } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', c.id)
                        .order('created_at', { ascending: true })

                    loadedConversations.push({
                        id: c.id,
                        title: c.title || "New Chat",
                        lastUpdated: new Date(c.last_updated).getTime(),
                        messages: msgs?.map((m: any) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            tokens: m.tokens
                        })) || []
                    })
                }

                if (loadedConversations.length > 0 || remoteKeys.length > 0) {
                    set(state => ({
                        conversations: loadedConversations.length > 0 ? loadedConversations : state.conversations,
                        activeConversationId: loadedConversations.length > 0 ? loadedConversations[0].id : state.activeConversationId,
                        messages: loadedConversations.length > 0 ? loadedConversations[0].messages : state.messages,
                        apiKeys: remoteKeys.length > 0 ? remoteKeys : state.apiKeys
                    }))
                    toast.success("Sync completed")
                }
            },

            smartRoutingEnabled: false,
            toggleSmartRouting: () => set(state => ({ smartRoutingEnabled: !state.smartRoutingEnabled })),

            systemPrompt: "",
            setSystemPrompt: (prompt) => set({ systemPrompt: prompt })
        }),
        {
            name: 'chatbot-storage',
            partialize: (state) => ({
                apiKeys: state.apiKeys,
                conversations: state.conversations,
                smartRoutingEnabled: state.smartRoutingEnabled,
                systemPrompt: state.systemPrompt
            }),
            onRehydrateStorage: () => (state) => {
                // Check auth on load and sync
                setTimeout(() => {
                    state?.syncWithSupabase()
                }, 1000)
            }
        }
    )
)
