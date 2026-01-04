# AAAOP - All AI At One Place 🤖

> **A unified multi-provider AI chat interface with intelligent routing, conversation management, and split-view comparison.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Use Cases](#use-cases)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

**AAAOP (All AI At One Place)** is a powerful, production-ready chat application that brings together multiple AI providers under one unified interface. Instead of juggling between ChatGPT, Claude, Gemini, and other AI services, AAAOP lets you:

- **Access 12+ AI providers** from a single interface
- **Compare responses** side-by-side with Split View
- **Automatic failover** when one provider is down
- **Smart routing** that picks the best AI for your task
- **Organize conversations** with folders and pinning
- **Preserve context** when switching between providers

---

## ✨ Features

### 🔄 Multi-Provider Support
- **12 AI Providers**: OpenAI, Gemini, DeepSeek, Anthropic (Claude), Groq, Mistral, Cohere, Perplexity, Together AI, OpenRouter, and more
- **Automatic Failover**: If one provider fails, automatically switches to the next available one while preserving your conversation context
- **Smart Routing**: Intelligently selects the best provider based on your query type (coding, reasoning, search, etc.)

### 🎯 Smart Features
- **Split View (Arena Mode)**: Compare two AI responses side-by-side - unlocked after 20 messages
- **Context Preservation**: Full conversation history is maintained when switching providers
- **Intelligent Timeouts**: Faster providers get 5s, slower ones get 30s to respond
- **Rate Limiting**: Automatic 24-hour cooldown for failed API keys

### 📁 Organization
- **Folders**: Organize your conversations into custom folders
- **Pin Conversations**: Keep important chats at the top
- **Auto-Titling**: Conversations are automatically named based on your first message
- **Empty Chat Cleanup**: Unused "New Chat" instances are automatically removed

### 🎨 User Experience
- **Real-time Streaming**: See AI responses as they're generated
- **Markdown Support**: Full markdown rendering with syntax highlighting for code
- **Message Actions**: Edit, regenerate, copy, or export any message
- **Auto-scroll**: Automatically scrolls to show the latest response
- **Dark Mode**: Beautiful dark theme optimized for long sessions

### 🔐 Privacy & Data
- **Supabase Integration**: Secure cloud storage for conversations and API keys
- **Local-First**: Works offline with local state management
- **No Data Sharing**: Your API keys and conversations stay private

---

## 🎯 Use Cases

### For Developers
- **Code Debugging**: Get help from DeepSeek for complex algorithms, Claude for code review
- **Multi-Language Support**: Compare how different AIs handle Python vs JavaScript questions
- **API Testing**: Test multiple AI providers without switching tabs

### For Researchers
- **Response Comparison**: Use Split View to compare how GPT-4 vs Claude answer the same question
- **Fact-Checking**: Use Perplexity for real-time web search, then verify with other models
- **Literature Review**: Organize research topics in folders

### For Content Creators
- **Writing Assistance**: Get multiple perspectives on your content
- **Brainstorming**: Compare creative ideas from different AI personalities
- **SEO Optimization**: Use search-optimized models for keyword research

### For Students
- **Study Help**: Organize subjects in folders, pin important conversations
- **Homework Assistance**: Get explanations from multiple AI tutors
- **Research Projects**: Keep all project-related chats in one place

### For Businesses
- **Customer Support**: Draft responses and compare tone across providers
- **Market Research**: Analyze trends with search-enabled models
- **Content Strategy**: Generate and compare marketing copy

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Markdown**: react-markdown, remark-gfm
- **Code Highlighting**: react-syntax-highlighter

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API Routes**: Next.js API Routes
- **Streaming**: Server-Sent Events (SSE)

### AI Providers
- OpenAI, Google Gemini, DeepSeek (via Hyperbolic), Anthropic Claude, Groq, Mistral AI, Cohere, Perplexity AI, Together AI, OpenRouter, Hugging Face

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** or **pnpm**
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/)

### Installation

#### Step 1: Clone the Repository

```bash
git clone https://github.com/kaushaltekade/chatbot.git
cd chatbot
```

#### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Environment Setup

#### Step 3: Create Environment File

Create a `.env.local` file in the root directory:

```bash
touch .env.local
```

#### Step 4: Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **anon/public key**

Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Step 5: Set Up Database Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  last_updated BIGINT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  folder_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_keys table
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  key_value TEXT NOT NULL,
  usage INTEGER DEFAULT 0,
  limit INTEGER,
  label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folders table
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat similar policies for messages, api_keys, and folders
```

### Running the Application

#### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

#### Step 7: First-Time Setup

1. **Sign Up**: Create an account at http://localhost:3000/login
2. **Add API Keys**: Go to Settings and add at least one AI provider API key
3. **Start Chatting**: Click "New Chat" and send your first message!

---

## ⚙️ Configuration

### Adding API Keys

1. Navigate to **Settings** (gear icon in sidebar)
2. Click **"Add API Key"**
3. Select your provider (e.g., OpenAI, Gemini)
4. Paste your API key
5. (Optional) Add a label and set usage limits
6. Click **Save**

### Getting API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Google Gemini**: https://makersuite.google.com/app/apikey
- **Anthropic**: https://console.anthropic.com/
- **Groq**: https://console.groq.com/
- **Perplexity**: https://www.perplexity.ai/settings/api
- **Cohere**: https://dashboard.cohere.com/api-keys

### Smart Routing Configuration

Enable/disable Smart Routing in Settings:
- **Enabled**: AI automatically picks the best provider for your query
- **Disabled**: Uses providers in the order you've arranged them

---

## 📁 Project Structure

```
chatbot/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/chat/          # Chat API endpoint
│   │   ├── login/             # Authentication page
│   │   ├── settings/          # Settings page
│   │   └── page.tsx           # Main chat interface
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── chat-pane.tsx      # Chat interface
│   │   ├── chat-sidebar.tsx   # Conversation sidebar
│   │   ├── message-bubble.tsx # Message rendering
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   │   └── use-chat-stream.ts # Chat streaming logic
│   ├── lib/                   # Utilities
│   │   ├── supabase/          # Supabase client
│   │   └── utils.ts           # Helper functions
│   ├── services/              # AI provider integrations
│   │   └── llm/               # LLM provider classes
│   └── store/                 # State management
│       └── chat-store.ts      # Zustand store
├── public/                    # Static assets
├── .env.local                 # Environment variables (create this)
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)

---

## 📧 Support

For support, email kaushaltekade@example.com or open an issue on GitHub.

---

**Made with ❤️ by Kaushal Tekade**
