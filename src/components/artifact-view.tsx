"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useChatStore } from "@/store/chat-store"
import { X, Code, Play, Check, Copy, Maximize2, Minimize2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ArtifactViewProps {
    width?: number | string
    isResizing?: boolean
}

export function ArtifactView({ width = "45%", isResizing = false }: ArtifactViewProps) {
    const { isArtifactOpen, artifactContent, toggleArtifact, activeArtifactTab, setActiveArtifactTab, isArtifactFullscreen, setIsArtifactFullscreen } = useChatStore()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isArtifactFullscreen) {
                setIsArtifactFullscreen(false)
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isArtifactFullscreen, setIsArtifactFullscreen])

    if (!isArtifactOpen || !artifactContent) return null

    // Inner Content Component to reuse logic
    const Content = (
        <ArtifactContent
            isFullscreen={isArtifactFullscreen}
            activeTab={activeArtifactTab || "preview"}
            setActiveTab={setActiveArtifactTab || (() => { })}
            setIsFullscreen={setIsArtifactFullscreen}
            artifactContent={artifactContent}
            toggleArtifact={toggleArtifact}
        />
    )

    if (isArtifactFullscreen && mounted) {
        return createPortal(
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100000] w-full h-full flex flex-col"
                style={{ backgroundColor: 'hsl(var(--background))' }}
            >
                {Content}
            </motion.div>,
            document.body
        )
    }

    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: width, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
            className="h-full border-l bg-background flex flex-col shadow-xl relative z-40"
        >
            {Content}
        </motion.div>
    )
}

function ArtifactContent({
    isFullscreen,
    activeTab,
    setActiveTab,
    setIsFullscreen,
    artifactContent,
    toggleArtifact
}: any) {
    const [copied, setCopied] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const handleCopy = () => {
        navigator.clipboard.writeText(artifactContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success("Code copied to clipboard")
    }

    const handleDownload = () => {
        const blob = new Blob([artifactContent], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "artifact-content.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Downloaded artifact")
    }

    const generatePreviewContent = (code: string) => {
        // Simple heuristic to detect if it's a React component
        const isReact = code.includes("import React") || code.includes("export default function") || code.includes("return (")

        if (!isReact) {
            return code // Assume HTML
        }

        // For React, we inject a simple runtime
        // This is a basic implementation. For production, consider sandpack or stronger isolation.
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
                    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #000000; }
                    </style>
                </head>
                <body>
                    <div id="root"></div>
                    <script type="text/babel">
                        window.onerror = function(msg, url, line) {
                            document.body.innerHTML = '<div style="color: red; padding: 20px; background: #ffeeee; border: 1px solid red; border-radius: 8px;"><h3>Preview Error</h3><pre>' + msg + '</pre></div>';
                        };
                        
                        try {
                            const { useState, useEffect, useRef, useMemo } = React;
                            const { createRoot } = ReactDOM;
                            
                            // Remove imports for preview
                            const code = \`${code.replace(/^import.*$/gm, '')}\`;
                            
                            // Transform and Execute
                            // We wrap in a function to avoid global scope pollution
                            const Component = (function() {
                                ${artifactContent.includes("export default") ? "" : "return null;"} 
                                ${artifactContent}
                                return ${artifactContent.match(/export default function (\w+)/)?.[1] || 'null'};
                            })();

                            if (Component) {
                                const root = createRoot(document.getElementById("root"));
                                root.render(<Component />);
                            }
                        } catch (err) {
                            console.error(err);
                            document.body.innerHTML = '<div style="color: red; padding: 20px;">' + err.message + '</div>';
                        }
                    </script>
                </body>
            </html>
        `
    }

    // Toggle fullscreen would normally update state
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen)
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background/100 h-14 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Artifact</span>
                    <div className="flex items-center bg-muted rounded-lg p-0.5 border">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("preview")}
                            className={cn(
                                "h-7 px-3 text-xs rounded-md transition-all",
                                activeTab === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Play className="w-3 h-3 mr-1.5" />
                            Preview
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("code")}
                            className={cn(
                                "h-7 px-3 text-xs rounded-md transition-all",
                                activeTab === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Code className="w-3 h-3 mr-1.5" />
                            Code
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Download">
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={toggleFullscreen}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleArtifact}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-muted/50">
                {activeTab === "preview" ? (
                    <div className="w-full h-full overflow-hidden flex items-center justify-center bg-[url('/checker-pattern.png')]">
                        <div className="bg-white w-full h-full shadow-sm border-0 overflow-hidden">
                            {/* Sandboxed Iframe for Preview */}
                            <iframe
                                ref={iframeRef}
                                srcDoc={generatePreviewContent(artifactContent || "")}
                                title="Preview"
                                className="w-full h-full border-0 bg-white"
                                sandbox="allow-scripts allow-modals"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full overflow-auto">
                        <SyntaxHighlighter
                            language="typescript"
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '1.5rem', height: '100%', fontSize: '13px' }}
                            showLineNumbers={true}
                            wrapLines={true}
                        >
                            {artifactContent || ""}
                        </SyntaxHighlighter>
                    </div>
                )}
            </div>
        </>
    )
}
