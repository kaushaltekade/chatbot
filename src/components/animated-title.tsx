"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function AnimatedTitle() {
    const [isExpanded, setIsExpanded] = useState(true)

    useEffect(() => {
        const timer = setInterval(() => {
            setIsExpanded((prev) => !prev)
        }, 3000) // Toggle every 3 seconds

        return () => clearInterval(timer)
    }, [])

    const words = [
        { first: "A", rest: "LL" },
        { first: "A", rest: "I" },
        { first: "A", rest: "T" },
        { first: "O", rest: "NE" },
        { first: "P", rest: "LACE" },
    ]

    return (
        <div className="flex items-center justify-center h-12">
            <div className="flex items-baseline overflow-hidden">
                {words.map((word, index) => (
                    <motion.div
                        key={index}
                        className="flex items-baseline"
                        animate={{
                            marginRight: isExpanded && index !== words.length - 1 ? 6 : 0
                        }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                    >
                        <span className="text-xl font-bold font-heading tracking-wide text-foreground">
                            {word.first}
                        </span>
                        <motion.span
                            initial={{ width: "auto", opacity: 1 }}
                            animate={{
                                width: isExpanded ? "auto" : 0,
                                opacity: isExpanded ? 1 : 0,
                            }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="text-xl font-bold font-heading tracking-wide text-foreground overflow-hidden whitespace-nowrap"
                        >
                            {word.rest}
                        </motion.span>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
