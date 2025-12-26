import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'anthropic' | 'groq' | 'mistral' | 'cohere' | 'huggingface' | 'openrouter'

export interface ApiKey {
    id: string
    provider: AIProvider
    key: string
    usage: number // Tokens used or remaining (depends on provider logic)
    limit?: number
    isActive: boolean
    label?: string
}

export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    tokens?: number // For token tracking
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
    addApiKey: (key: ApiKey) => void
    updateApiKey: (id: string, updates: Partial<ApiKey>) => void
    deleteApiKey: (id: string) => void

    // Chat State
    conversations: Conversation[]
    activeConversationId: string | null
    messages: Message[] // Current active messages
    isLoading: boolean

    // Actions
    createConversation: () => void
    selectConversation: (id: string) => void
    addMessage: (message: Message) => void
    updateMessage: (id: string, content: string) => void
    setLoading: (loading: boolean) => void

    // Basic UI state
    isSidebarOpen: boolean
    toggleSidebar: () => void
}

export const useChatStore = create<ChatStore>()(
    persist(
        (set) => ({
            apiKeys: [],
            setApiKeys: (keys) => set({ apiKeys: keys }),
            addApiKey: (key) => set((state) => ({ apiKeys: [...state.apiKeys, key] })),
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
                    return { messages: newMessages, conversations: updatedConversations }
                })
            },
            setLoading: (loading) => set({ isLoading: loading }),

            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        }),
        {
            name: 'chatbot-storage', // name of the item in the storage (must be unique)
            partialize: (state) => ({
                apiKeys: state.apiKeys,
                conversations: state.conversations // Persist history
            }),
        }
    )
)
