import { Conversation, Message } from "@/store/chat-store"

export const downloadAsFile = (content: string, filename: string, type: 'markdown' | 'json') => {
    const blob = new Blob([content], {
        type: type === 'markdown' ? 'text/markdown' : 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export const convertToMarkdown = (conversation: Conversation): string => {
    const date = new Date(conversation.lastUpdated).toLocaleDateString()
    let md = `# ${conversation.title}\n\n`
    md += `_Exported on ${date}_\n\n---\n\n`

    conversation.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant'
        md += `### ${role}\n\n${msg.content}\n\n---\n\n`
    })

    return md
}

export const exportChat = (conversation: Conversation, format: 'markdown' | 'json' = 'markdown') => {
    if (!conversation) return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedTitle = conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()

    if (format === 'json') {
        const jsonContent = JSON.stringify(conversation, null, 2)
        downloadAsFile(jsonContent, `${sanitizedTitle}_${timestamp}.json`, 'json')
    } else {
        const mdContent = convertToMarkdown(conversation)
        downloadAsFile(mdContent, `${sanitizedTitle}_${timestamp}.md`, 'markdown')
    }
}
