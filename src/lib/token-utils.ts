/**
 * Simple token estimation logic.
 * precision: 'fast' (char count / 4) or 'exact' (using encoding - not implemented yet to save bundle size)
 */
export function estimateTokens(text: string, provider: string = 'openai'): number {
    if (!text) return 0

    // Rule of thumb: 1 token ~= 4 chars in English
    // This is a rough estimate for UI feedback
    return Math.ceil(text.length / 4)
}

export function formatTokenCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
}
