"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArtifactView } from "@/components/artifact-view"
import { AnimatePresence } from "framer-motion"

interface ResizableArtifactPanelProps {
    isArtifactOpen: boolean
}

export function ResizableArtifactPanel({ isArtifactOpen }: ResizableArtifactPanelProps) {
    const [artifactWidth, setArtifactWidth] = useState(450)
    const [isResizing, setIsResizing] = useState(false)
    const animationFrameId = useRef<number | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Delay slightly to avoid synchronous state update warning during mount
            setTimeout(() => {
                setArtifactWidth(Math.min(600, window.innerWidth * 0.45))
            }, 0)
        }
    }, [])

    const startResizing = useCallback(() => {
        setIsResizing(true)
    }, [])

    const stopResizing = useCallback(() => {
        setIsResizing(false)
    }, [])

    useEffect(() => {
        if (isResizing) {
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
            const iframes = document.querySelectorAll('iframe')
            iframes.forEach(iframe => iframe.style.pointerEvents = 'none')
        } else {
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            const iframes = document.querySelectorAll('iframe')
            iframes.forEach(iframe => iframe.style.pointerEvents = '')
        }
    }, [isResizing])

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)

            animationFrameId.current = requestAnimationFrame(() => {
                const newWidth = window.innerWidth - mouseMoveEvent.clientX
                // Min 300px, Max 80% of screen
                if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
                    setArtifactWidth(newWidth)
                }
            })
        }
    }, [isResizing])

    useEffect(() => {
        window.addEventListener("mousemove", resize)
        window.addEventListener("mouseup", stopResizing)
        return () => {
            window.removeEventListener("mousemove", resize)
            window.removeEventListener("mouseup", stopResizing)
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
        }
    }, [resize, stopResizing])

    return (
        <AnimatePresence>
            {isArtifactOpen && (
                <>
                    <div
                        className="w-1.5 hover:w-2 bg-border/50 hover:bg-primary/50 cursor-col-resize z-50 transition-all duration-150 flex items-center justify-center group"
                        onMouseDown={startResizing}
                    >
                        <div className="w-0.5 h-8 bg-muted-foreground/20 group-hover:bg-primary rounded-full transition-colors" />
                    </div>
                    <ArtifactView width={artifactWidth} isResizing={isResizing} />
                </>
            )}
        </AnimatePresence>
    )
}
