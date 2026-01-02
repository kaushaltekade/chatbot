"use client"

import { Button } from "@/components/ui/button"
import { useChatStore } from "@/store/chat-store"
import { supabase } from "@/lib/supabase/client"
import { Github, LogIn, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import type { User } from "@supabase/supabase-js"

// Simple Google Icon since lucide doesn't have it standard
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
            </g>
        </svg>
    )
}

export function AuthButtons() {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            setIsLoading(false)
        })

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null)
            if (event === 'SIGNED_IN') {
                useChatStore.getState().syncWithSupabase()
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogin = async (provider: 'google' | 'github') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            toast.success("Logged out successfully")
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    if (isLoading) return null

    if (user) {
        return (
            <div className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 overflow-hidden">
                    {user.user_metadata.avatar_url && (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full"
                        />
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate text-foreground/90">
                            {user.user_metadata.full_name || user.email}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                            {user.email}
                        </span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={handleLogout}
                    title="Sign Out"
                >
                    <LogOut className="w-3.5 h-3.5" />
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs h-8"
                onClick={() => handleLogin('google')}
            >
                <GoogleIcon className="w-3.5 h-3.5" />
                Continue with Google
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs h-8"
                onClick={() => handleLogin('github')}
            >
                <Github className="w-3.5 h-3.5" />
                Continue with GitHub
            </Button>
        </div>
    )
}
