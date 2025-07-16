// System prompts for different models to optimize their performance

interface SystemPrompt {
  prompt: string;
  description: string;
}

// --- UNIFIED SYSTEM PROMPT for ALL MODELS ---
const unifiedPrompt = `You are NuroChat, an AI assistant powered by the latest AI model. Your role is to assist and engage in conversation while being helpful, respectful, and engaging.

Here are your key instructions:

- Identity: You are NuroChat, an AI assistant.
- Model: You are powered by the latest AI model. Only mention this if specifically asked.
- Purpose: To assist and engage in conversation, being helpful, respectful, and engaging.
- Mathematical Notation: Use LaTeX for mathematical expressions.
  - Inline math: wrap in \( ... \)
  - Display math: wrap in $$ ... $$
  - Do not use single dollar signs for inline math.
- Parentheses: Use actual parentheses, do not escape them with backslashes.
- Code Formatting: Format code using Prettier with a print width of 80 characters and present in Markdown code blocks with the correct language extension.
- Respond quickly and concisely, skipping unnecessary preambles.
- If asked about your identity, say: "I am NuroChat, an AI assistant."
`;

// Map of model IDs to their optimized system prompts
export const systemPrompts: Record<string, SystemPrompt> = {
  // OpenAI models
  "openai/gpt-4.1": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (OpenAI)"
  },
  "openai/o4-mini": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (OpenAI)"
  },
  // Meta models
  "meta/llama-3-70b-instruct": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Meta)"
  },
  "meta/llama-3-8b-instruct": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Meta)"
  },
  "meta/Llama-4-Maverick-17B-128E-Instruct-FP8": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Meta)"
  },
  // Mistral models
  "mistralai/mixtral-8x7b-instruct": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Mistral)"
  },
  "mistralai/mistral-small": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Mistral)"
  },
  "mistralai/mistral-medium": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Mistral)"
  },
  "mistralai/mistral-large": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Mistral)"
  },
  // Gemini models
  "gemini/2.0-flash": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Gemini 2.0 Flash)"
  },
  "gemini/2.5-flash": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (Gemini 2.5 Flash)"
  },
  // xAI Grok model
  "xai/grok-3": {
    prompt: unifiedPrompt,
    description: "Unified NuroChat persona (xAI Grok-3)"
  }
};

// Get system prompt for a model, with fallback to default
export function getSystemPrompt(modelId: string): string {
  // Check for custom system prompt in localStorage (client-side only)
  if (typeof window !== 'undefined') {
    const customPrompt = localStorage.getItem('custom-system-prompt');
    if (customPrompt && customPrompt.trim()) {
      return customPrompt;
    }
  }
  
  return systemPrompts[modelId]?.prompt || 
    "You are a helpful assistant. Provide clear and concise responses.";
}

// Get system prompt description for a model, with fallback to default
export function getSystemPromptDescription(modelId: string): string {
  return systemPrompts[modelId]?.description || "Standard assistant";
}

// Client-side utility functions for custom system prompts
export function setCustomSystemPrompt(prompt: string): void {
  if (typeof window !== 'undefined') {
    if (prompt.trim()) {
      localStorage.setItem('custom-system-prompt', prompt);
    } else {
      localStorage.removeItem('custom-system-prompt');
    }
  }
}

export function getCustomSystemPrompt(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('custom-system-prompt');
  }
  return null;
}

export function clearCustomSystemPrompt(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('custom-system-prompt');
  }
}

export function hasCustomSystemPrompt(): boolean {
  if (typeof window !== 'undefined') {
    const customPrompt = localStorage.getItem('custom-system-prompt');
    return customPrompt !== null && customPrompt.trim() !== '';
  }
  return false;
}
