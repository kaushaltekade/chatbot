"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
// import { Icons } from "@/components/icons" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> { }

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
    const [isLoading, setIsLoading] = React.useState<boolean>(false)

    async function onSubmit(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)

        // TODO: Email sign in logic
        setTimeout(() => {
            setIsLoading(false)
        }, 3000)
    }

    const loginWithProvider = async (provider: 'github' | 'google') => {
        setIsLoading(true)
        try {
            await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className="grid gap-1">
                        <Label className="sr-only" htmlFor="email">
                            Email
                        </Label>
                        <Input
                            id="email"
                            placeholder="name@example.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isLoading}
                        />
                    </div>
                    <Button disabled={isLoading}>
                        {isLoading && (
                            // <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            <span className="mr-2">...</span>
                        )}
                        Sign In with Email
                    </Button>
                </div>
            </form>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>
            <Button variant="outline" type="button" disabled={isLoading} onClick={() => loginWithProvider('github')}>
                {/* <Icons.gitHub className="mr-2 h-4 w-4" /> */}
                GitHub
            </Button>
            <Button variant="outline" type="button" disabled={isLoading} onClick={() => loginWithProvider('google')}>
                {/* <Icons.google className="mr-2 h-4 w-4" /> */}
                Google
            </Button>
        </div>
    )
}
