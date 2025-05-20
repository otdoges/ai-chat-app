# AI Chat Interface

A chat interface application that uses GitHub Marketplace AI models for generating responses and stores conversation history in IndexedDB.

## Features

- Beautiful UI built with Next.js and Shadcn UI components
- Integration with GitHub Marketplace models
- Local data storage using IndexedDB (no server-side database required)
- Responsive design
- Message history persistence

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or if you use pnpm
pnpm install
```

### 2. Set up GitHub Token

Create a personal access token with `models:read` permission from your GitHub account. You can create one at https://github.com/settings/tokens.

Once you have your token, create a `.env` file in the root directory with:

```
GITHUB_TOKEN=your_github_token_here
```

You can also customize the model and endpoint (optional):

```
AI_MODEL=openai/gpt-4.1
AI_ENDPOINT=https://models.github.ai/inference
```

### 3. Run the Development Server

```bash
npm run dev
# or if you use pnpm
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How It Works

1. The chat interface is built with React and uses the IndexedDB browser database to store conversation history.
2. When you send a message, it's first stored locally and displayed in the UI.
3. The message is then sent to the GitHub AI model API via the Next.js backend.
4. The response from the AI model is received, stored locally, and displayed in the UI.

## Technical Architecture

- **Frontend**: Next.js with React and Shadcn UI components
- **API**: Next.js API routes to communicate with GitHub AI models
- **Storage**: IndexedDB for client-side storage
- **Authentication**: GitHub token for accessing the AI models

## Important Files

- `chat-interface.tsx` - Main chat UI component
- `lib/services/db.ts` - IndexedDB service for local storage
- `lib/services/aiService.ts` - Service for communicating with GitHub AI models
- `app/api/chat/route.ts` - API endpoint for handling chat requests

## Environment Variables

- `GITHUB_TOKEN` - Your GitHub personal access token
- `AI_MODEL` - The AI model to use (default: openai/gpt-4.1)
- `AI_ENDPOINT` - The GitHub AI inference endpoint
