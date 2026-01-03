export function determineFilename(content: string, language: string = "typescript"): string {
    const lang = language.toLowerCase()

    // 1. CSS
    if (lang === 'css' || lang === 'scss' || lang === 'less') {
        return 'style.css'
    }

    // 2. HTML
    if (lang === 'html' || lang === 'xml') {
        return 'index.html'
    }

    // 3. React / TypeScript / JavaScript
    if (['typescript', 'javascript', 'jsx', 'tsx', 'react'].includes(lang)) {
        // Try to find component name
        const exportMatch = content.match(/export\s+default\s+function\s+(\w+)/) ||
            content.match(/export\s+function\s+(\w+)/) ||
            content.match(/function\s+(\w+)/) ||
            content.match(/const\s+(\w+)\s*=\s*(?:function|\(.*\)\s*=>)/)

        if (exportMatch && exportMatch[1]) {
            const ext = lang.includes('ts') || lang === 'tsx' ? 'tsx' : 'jsx'
            return `${exportMatch[1]}.${ext}`
        }

        // Fallback extensions
        if (lang === 'typescript' || lang === 'ts') return 'script.ts'
        if (lang === 'javascript' || lang === 'js') return 'script.js'
        return 'component.tsx'
    }

    // 4. Python
    if (lang === 'python' || lang === 'py') {
        return 'script.py'
    }

    // 5. JSON
    if (lang === 'json') {
        return 'data.json'
    }

    // 6. SQL
    if (lang === 'sql') {
        return 'query.sql'
    }

    // Default
    return `download.${lang}`
}
