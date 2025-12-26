"use client"

import { ApiKeyManager } from "@/components/settings/api-key-manager"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">Settings</h1>
            </div>

            <div className="grid gap-8">
                <ApiKeyManager />
            </div>
        </div>
    )
}
