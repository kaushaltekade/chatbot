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
    rateLimitedUntil?: number
    isActive: boolean
    label?: string
}

export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    tokens?: number
}

export interface Conversation {
    id: string
    title: string
    messages: Message[]
    lastUpdated: number
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
    selectConversation: (id: string) => void
    addMessage: (message: Message) => void
    updateMessage: (id: string, content: string) => void
    deleteMessage: (id: string) => void
    setLoading: (loading: boolean) => void

    // Basic UI state
    isSidebarOpen: boolean
    toggleSidebar: () => void

    // Data Management
    clearAllData: () => void
    syncWithSupabase: () => Promise<void> // Force sync

    // PREFERENCES
    smartRoutingEnabled: boolean
    toggleSmartRouting: () => void
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
            last_updated: new Date(conversation.lastUpdated).toISOString()
        })
    if (error) console.error("Failed to sync conversation:", error)
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

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
            apiKeys: [],
            setApiKeys: (keys) => set({ apiKeys: keys }),
            reorderApiKeys: (keys: ApiKey[]) => set({ apiKeys: keys }),
            addApiKey: (key) => set((state) => {
                const exists = state.apiKeys.some(k => k.id === key.id)
                if (exists) {
                    return {
                        apiKeys: state.apiKeys.map(k => k.id === key.id ? key : k)
                    }
                }
                return { apiKeys: [...state.apiKeys, key] }
            }),
            updateApiKey: (id, updates) =>
                set((state) => ({
                    apiKeys: state.apiKeys.map((k) => (k.id === id ? { ...k, ...updates } : k)),
                })),
            deleteApiKey: (id) =>
                set((state) => ({ apiKeys: state.apiKeys.filter((k) => k.id !== id) })),

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
            updateMessage: (id, content) => {
                set(state => {
                    const newMessages = state.messages.map(m =>
                        m.id === id ? { ...m, content } : m
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

                if (loadedConversations.length > 0) {
                    set({
                        conversations: loadedConversations,
                        activeConversationId: loadedConversations[0].id,
                        messages: loadedConversations[0].messages
                    })
                    toast.success("Sync completed")
                }
            },

            smartRoutingEnabled: false,
            toggleSmartRouting: () => set(state => ({ smartRoutingEnabled: !state.smartRoutingEnabled }))
        }),
        {
            name: 'chatbot-storage',
            partialize: (state) => ({
                apiKeys: state.apiKeys,
                conversations: state.conversations,
                smartRoutingEnabled: state.smartRoutingEnabled
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
