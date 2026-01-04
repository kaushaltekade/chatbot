import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

export interface Prompt {
    id: string
    title: string
    content: string
    category?: string
    usageCount: number
    lastUsed: number
    isBuiltIn?: boolean // For default system prompts
}

// Initial built-in prompts
const DEFAULT_PROMPTS: Prompt[] = [
    {
        id: 'builtin-1',
        title: 'Fix Code',
        content: 'Please analyze this code for bugs and fix them, explaining your changes:',
        category: 'Coding',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-2',
        title: 'Explain Concept',
        content: 'Explain the following concept like I am 5 years old:',
        category: 'Learning',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-3',
        title: 'Refactor',
        content: 'Refactor this code to be more clean, efficient, and modern:',
        category: 'Coding',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-4',
        title: 'Write Email',
        content: 'Draft a professional email to [recipient] regarding [subject]. Keep it concise and polite.',
        category: 'Writing',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-5',
        title: 'Summarize Text',
        content: 'Please summarize the following text into 3 key bullet points:',
        category: 'Analysis',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-6',
        title: 'Debug Error',
        content: 'I am getting the following error message. What does it mean and how do I fix it?',
        category: 'Coding',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-7',
        title: 'Story Idea',
        content: 'Give me a unique premise for a short sci-fi story involving time travel and a toaster.',
        category: 'Creative',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-8',
        title: 'SQL Query',
        content: 'Write a complex SQL query to select [fields] from [table] where [condition].',
        category: 'Coding',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-9',
        title: 'Review Resume',
        content: 'Critique this resume snippet and suggest improvements for a senior developer role:',
        category: 'Career',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    },
    {
        id: 'builtin-10',
        title: 'Regex Help',
        content: 'Write a Regular Expression (Regex) to match the following pattern:',
        category: 'Coding',
        usageCount: 0,
        lastUsed: 0,
        isBuiltIn: true
    }
]

interface PromptStore {
    prompts: Prompt[]

    // Actions
    addPrompt: (prompt: Omit<Prompt, 'id' | 'usageCount' | 'lastUsed'>) => void
    updatePrompt: (id: string, updates: Partial<Prompt>) => void
    deletePrompt: (id: string) => void
    usePrompt: (id: string) => void // Increment usage count
    resetDefaults: () => void
}

export const usePromptStore = create<PromptStore>()(
    persist(
        (set) => ({
            prompts: DEFAULT_PROMPTS,

            addPrompt: (prompt) => set((state) => ({
                prompts: [
                    {
                        ...prompt,
                        id: generateId(),
                        usageCount: 0,
                        lastUsed: Date.now()
                    },
                    ...state.prompts
                ]
            })),

            updatePrompt: (id, updates) => set((state) => ({
                prompts: state.prompts.map((p) =>
                    p.id === id ? { ...p, ...updates } : p
                )
            })),

            deletePrompt: (id) => set((state) => ({
                prompts: state.prompts.filter((p) => p.id !== id)
            })),

            usePrompt: (id) => set((state) => ({
                prompts: state.prompts.map((p) =>
                    p.id === id
                        ? { ...p, usageCount: (p.usageCount || 0) + 1, lastUsed: Date.now() }
                        : p
                ).sort((a, b) => b.lastUsed - a.lastUsed) // Move recently used to top
            })),

            resetDefaults: () => set({ prompts: DEFAULT_PROMPTS })
        }),
        {
            name: 'chatbot-prompts',
        }
    )
)
