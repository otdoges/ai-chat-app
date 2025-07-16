# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` or `pnpm dev` - Start development server with Turbopack
- `npm run build` or `pnpm build` - Build for production
- `npm start` or `pnpm start` - Start production server
- `npm run lint` or `pnpm lint` - Run ESLint

## Architecture Overview

This is a Next.js 15 AI chat application with local data persistence using IndexedDB.

### Key Components:
- **Frontend**: React 19 with Shadcn UI components, Tailwind CSS
- **Backend**: Next.js API routes (`app/api/chat/route.ts`)
- **AI Integration**: GitHub Marketplace models via Azure REST AI Inference
- **Storage**: IndexedDB for client-side message persistence (no server database)

### Core Services:
- `lib/services/aiService.ts` - AI model management and streaming responses
- `lib/services/db.ts` - IndexedDB wrapper for message storage
- `chat-interface.tsx` - Main chat UI component

### Model Support:
The app supports multiple AI models from GitHub Marketplace:
- OpenAI (GPT-4.1, o4-mini)
- Meta LLaMA (3-8B, 3-70B, 4-Maverick)
- Mistral (Small, Medium, Large, Mixtral)
- Google Gemini (2.0 Flash, 2.5 Flash)
- xAI Grok-3
- Microsoft Phi-4 Mini

### Data Flow:
1. User sends message → stored in IndexedDB
2. Message sent to GitHub AI API via Next.js route
3. AI response streamed back and stored in IndexedDB
4. Messages persist per model (users can switch models and maintain separate histories)

### Environment Variables:
- `GITHUB_TOKEN` - Required GitHub personal access token with `models:read` permission
- `AI_MODEL` - Default model (optional, defaults to openai/gpt-4.1)
- `AI_ENDPOINT` - GitHub AI endpoint (optional, defaults to https://models.github.ai/inference)

## Key Implementation Details

- **Streaming**: Real-time AI responses using Server-Sent Events
- **Model Switching**: Separate conversation histories per AI model
- **Client Pool**: Reused HTTP clients for better performance
- **Response Caching**: 5-minute TTL cache for identical requests
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **Type Safety**: Full TypeScript with strict mode enabled