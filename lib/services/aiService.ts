import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { groq } from "@ai-sdk/groq";
import { generateText, streamText } from "ai";
import env from "../env";
import { getSystemPrompt } from "../systemPrompt";

interface StreamingResponse {
  choices: Array<{ delta: { content?: string } }>;
  usage?: { completion_tokens: number; prompt_tokens: number; total_tokens: number };
}

export interface ChatMessage {
  role: "user" | "system" | "assistant" | "developer" | "agent";
  content: string;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

interface ModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

const GROQ_MODELS = [
  'llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gemma2-9b-it',
  'meta-llama/llama-guard-4-12b', 'deepseek-r1-distill-llama-70b',
  'deepseek-r1-distill-qwen-32b', 'mistral-saba-24b', 'qwen-qwq-32b',
  'qwen-2.5-coder-32b', 'qwen-2.5-32b', 'llama-3.3-70b-specdec',
  'llama-3.2-1b-preview', 'llama-3.2-3b-preview', 'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview', 'moonshotai/kimi-k2-instruct'
];

const GEMINI_MODELS = [env.AI_MODELS.GEMINI_2_0_FLASH, env.AI_MODELS.GEMINI_2_5_FLASH];

export const availableModels = [
  { id: env.AI_MODELS.OPENAI_GPT_4_1, name: "GPT-4.1", provider: 'github', icon: 'openai.svg', contextWindow: 128000 },
  { id: env.AI_MODELS.OPENAI_O4_MINI, name: "O4 Mini", provider: 'github', icon: 'openai.svg', contextWindow: 128000 },
  { id: env.AI_MODELS.META_LLAMA_4_MAVERICK, name: "Llama 4 Maverick 17B", provider: 'github', icon: 'llama.svg', contextWindow: 128000 },
  { id: env.AI_MODELS.META_LLAMA_3_70B, name: "Llama 3 70B", provider: 'github', icon: 'llama.svg', contextWindow: 8192 },
  { id: env.AI_MODELS.META_LLAMA_3_8B, name: "Llama 3 8B", provider: 'github', icon: 'llama.svg', contextWindow: 8192 },
  
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Fast Llama model with instant responses' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Large, versatile Llama model' },
  { id: 'gemma2-9b-it', name: 'Gemma2 9B IT', provider: 'groq', icon: 'gemini.svg', contextWindow: 8192, description: 'Google Gemma2 instruction-tuned model' },
  { id: 'meta-llama/llama-guard-4-12b', name: 'Llama Guard 4 12B', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Meta Llama Guard safety model' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B', provider: 'groq', icon: 'deepseek.svg', contextWindow: 131072, description: 'DeepSeek reasoning model with <think> support', reasoning: true },
  { id: 'deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B', provider: 'groq', icon: 'deepseek.svg', contextWindow: 131072, description: 'DeepSeek reasoning model based on Qwen', reasoning: true },
  { id: 'mistral-saba-24b', name: 'Mistral Saba 24B', provider: 'groq', icon: 'mistral.svg', contextWindow: 32768, description: 'Mistral AI latest preview model' },
  { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B', provider: 'groq', icon: 'qwen.svg', contextWindow: 131072, description: 'Alibaba Cloud Qwen reasoning model' },
  { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B', provider: 'groq', icon: 'qwen.svg', contextWindow: 131072, description: 'Specialized coding model by Alibaba Cloud' },
  { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B', provider: 'groq', icon: 'qwen.svg', contextWindow: 131072, description: 'Latest Qwen model by Alibaba Cloud' },
  { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B SpecDec', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Llama 3.3 with speculative decoding' },
  { id: 'llama-3.2-1b-preview', name: 'Llama 3.2 1B Preview', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Compact Llama 3.2 model preview' },
  { id: 'llama-3.2-3b-preview', name: 'Llama 3.2 3B Preview', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Small Llama 3.2 model preview' },
  { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Llama 3.2 with vision capabilities', vision: true },
  { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision', provider: 'groq', icon: 'llama.svg', contextWindow: 131072, description: 'Large Llama 3.2 with vision capabilities', vision: true },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Moonshot Kimi K2', provider: 'groq', icon: 'openai.svg', contextWindow: 131072, description: 'Moonshot AI Kimi K2 instruction model' },
  
  { id: env.AI_MODELS.MISTRAL_MIXTRAL, name: "Mixtral 8x7B", provider: 'github', icon: 'mistral.svg', contextWindow: 32768 },
  { id: env.AI_MODELS.MISTRAL_SMALL, name: "Mistral Small", provider: 'github', icon: 'mistral.svg', contextWindow: 32768 },
  { id: env.AI_MODELS.MISTRAL_MEDIUM, name: "Mistral Medium", provider: 'github', icon: 'mistral.svg', contextWindow: 32768 },
  { id: env.AI_MODELS.MISTRAL_LARGE, name: "Mistral Large", provider: 'github', icon: 'mistral.svg', contextWindow: 32768 },
  { id: env.AI_MODELS.GEMINI_2_0_FLASH, name: "Gemini 2.0 Flash", provider: 'gemini', icon: 'gemini.svg', contextWindow: 1048576 },
  { id: env.AI_MODELS.GEMINI_2_5_FLASH, name: "Gemini 2.5 Flash", provider: 'gemini', icon: 'gemini.svg', contextWindow: 1048576 },
  { id: env.AI_MODELS.GROK_3, name: "Grok-3", description: "xAI's Grok-3 model via GitHub AI Inference", provider: 'github', icon: 'grok.svg', contextWindow: 131072 },
  { id: 'phi-4-mini', name: 'Phi-4 Mini', description: 'Microsoft Phi-4-mini-reasoning model', provider: 'github', icon: 'microsoft.svg', contextWindow: 128000, reasoning: true },
];

const defaultModelParams: Record<string, ModelParams> = {
  [env.AI_MODELS.OPENAI_GPT_4_1]: { temperature: 0.7, max_tokens: 1000 },
  [env.AI_MODELS.OPENAI_O4_MINI]: { temperature: 0.8, max_tokens: 1000, top_p: 1.0 },
  [env.AI_MODELS.META_LLAMA_4_MAVERICK]: { temperature: 0.7, max_tokens: 2000 },
  [env.AI_MODELS.META_LLAMA_3_70B]: { temperature: 0.7, max_tokens: 1000 },
  [env.AI_MODELS.META_LLAMA_3_8B]: { temperature: 0.8, max_tokens: 800 },
  [env.AI_MODELS.MISTRAL_MIXTRAL]: { temperature: 0.75, max_tokens: 1000 },
  [env.AI_MODELS.MISTRAL_SMALL]: { temperature: 0.8, max_tokens: 800 },
  [env.AI_MODELS.MISTRAL_MEDIUM]: { temperature: 0.7, max_tokens: 1000 },
  [env.AI_MODELS.MISTRAL_LARGE]: { temperature: 0.65, max_tokens: 1200 },
  [env.AI_MODELS.GEMINI_2_0_FLASH]: { temperature: 0.2, max_tokens: 1024 },
  [env.AI_MODELS.GEMINI_2_5_FLASH]: { temperature: 0.2, max_tokens: 1024 },
  ['phi-4-mini']: { temperature: 1.0, max_tokens: 1000, top_p: 1.0 },
  [env.AI_MODELS.GROK_3]: { temperature: 1.0, max_tokens: 1000, top_p: 1.0 },
};

const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

class AIService {
  private token = env.GITHUB_TOKEN;
  private endpoint = env.AI_ENDPOINT;
  private model = env.AI_MODEL;
  private clientPool = new Map<string, ReturnType<typeof ModelClient>>();

  constructor() {
    if (typeof window === 'undefined') {
      this.initClient();
    }
  }

  private initClient() {
    if (!this.token || GROQ_MODELS.includes(this.model)) return;
    
    const client = ModelClient(this.endpoint, new AzureKeyCredential(this.token), {
      apiVersion: "2024-12-01-preview",
      retryOptions: { maxRetries: 3, retryDelayInMs: 300, maxRetryDelayInMs: 2000 }
    });
    
    this.clientPool.set(this.model, client);
  }

  private getClient(modelId: string) {
    if (GROQ_MODELS.includes(modelId)) return null;
    if (this.clientPool.has(modelId)) return this.clientPool.get(modelId)!;
    
    if (!this.token) throw new Error('GitHub token is required for this model');
    
    const client = ModelClient(this.endpoint, new AzureKeyCredential(this.token), {
      apiVersion: "2024-12-01-preview",
      retryOptions: { maxRetries: 3, retryDelayInMs: 300, maxRetryDelayInMs: 2000 }
    });
    
    this.clientPool.set(modelId, client);
    return client;
  }

  private generateCacheKey(messages: ChatMessage[], modelId: string): string {
    const lastMessages = messages.slice(-3);
    const messageString = lastMessages.map(m => `${m.role}:${m.content}`).join('|');
    return `${modelId}:${messageString}`;
  }

  private formatMessages(messages: ChatMessage[]) {
    const systemPrompt = getSystemPrompt(this.model);
    return [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role === 'agent' ? 'assistant' : msg.role,
        content: msg.content,
      })),
    ];
  }

  private async handleGroqModel(messages: ChatMessage[], streamCallbacks?: StreamCallbacks): Promise<string> {
    if (!env.GROQ_API_KEY) {
      throw new Error('Groq API key is not configured. Please set the GROQ_API_KEY environment variable.');
    }

    const formattedMessages = this.formatMessages(messages);
    const modelInfo = availableModels.find(m => m.id === this.model);
    const isReasoningModel = modelInfo?.reasoning || this.model === 'deepseek-r1-distill-llama-70b';

    if (streamCallbacks) {
      return this.streamGroqResponse(formattedMessages, isReasoningModel, streamCallbacks);
    } else {
      return this.generateGroqResponse(formattedMessages, isReasoningModel);
    }
  }

  private async streamGroqResponse(messages: any[], isReasoningModel: boolean, callbacks: StreamCallbacks): Promise<string> {
    let fullText = '', reasoning = '', mainResponse = '', inThinking = false;

    const stream = await streamText({
      model: groq(this.model, {
        apiKey: env.GROQ_API_KEY,
        ...(isReasoningModel && { reasoningFormat: 'parsed' })
      }),
      messages,
      temperature: 0.7,
      maxTokens: 2000,
    });

    for await (const delta of stream.textStream) {
      fullText += delta;
      
      if (isReasoningModel) {
        if (delta.includes('<think>')) {
          inThinking = true;
          const thinkStart = delta.indexOf('<think>');
          if (thinkStart >= 0) reasoning += delta.substring(thinkStart + 7);
        } else if (delta.includes('</think>')) {
          inThinking = false;
          const thinkEnd = delta.indexOf('</think>');
          if (thinkEnd >= 0) reasoning += delta.substring(0, thinkEnd);
          reasoning += '\n---\n';
        } else if (inThinking) {
          reasoning += delta;
        } else {
          mainResponse += delta;
          callbacks.onToken?.(delta);
        }
      } else {
        callbacks.onToken?.(delta);
      }
    }

    let finalResponse = fullText;
    if (isReasoningModel && reasoning) {
      finalResponse = mainResponse || fullText;
      (finalResponse as any).__reasoning = reasoning;
    }

    callbacks.onComplete?.(finalResponse);
    return finalResponse;
  }

  private async generateGroqResponse(messages: any[], isReasoningModel: boolean): Promise<string> {
    const result = await generateText({
      model: groq(this.model, {
        apiKey: env.GROQ_API_KEY,
        ...(isReasoningModel && { reasoningFormat: 'parsed' })
      }),
      messages,
      temperature: 0.7,
      maxTokens: 2000,
    });

    let finalResponse = result.text;
    
    if (isReasoningModel && result.text.includes('<think>')) {
      const thinkMatch = result.text.match(/<think>([\s\S]*?)<\/think>/g);
      if (thinkMatch) {
        const reasoning = thinkMatch.map(match => match.replace(/<\/?think>/g, '')).join('\n---\n');
        const mainResponse = result.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        finalResponse = mainResponse;
        (finalResponse as any).__reasoning = reasoning;
      }
    }

    return finalResponse;
  }

  private async handleGeminiModel(messages: ChatMessage[], streamCallbacks?: StreamCallbacks): Promise<string> {
    const systemPrompt = getSystemPrompt(this.model);
    const formattedMessages = [
      { role: "user", content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role === "agent" ? "user" : msg.role, content: msg.content })),
    ];

    const geminiMessages = formattedMessages.map(m => ({
      role: m.role === "system" ? "user" : m.role,
      parts: [{ text: m.content }],
    }));

    let modelName = this.model;
    if (modelName === 'gemini/2.0-flash') modelName = 'gemini-2.0-flash';
    if (modelName === 'gemini/2.5-flash') modelName = 'gemini-2.5-flash-preview-04-17';

    const url = `${env.GEMINI_API_URL}/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("No response generated from Gemini.");
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    if (streamCallbacks?.onToken) streamCallbacks.onToken(responseText);
    if (streamCallbacks?.onComplete) streamCallbacks.onComplete(responseText);

    return responseText;
  }

  private async handleGitHubModel(messages: ChatMessage[], streamCallbacks?: StreamCallbacks): Promise<string> {
    const client = this.getClient(this.model);
    if (!client) throw new Error('Failed to initialize AI client');

    const formattedMessages = this.formatMessages(messages);
    const params = defaultModelParams[this.model] || { temperature: 0.7, max_tokens: 1000 };
    
    if (streamCallbacks) {
      return this.streamGitHubResponse(formattedMessages, params, streamCallbacks);
    } else {
      return this.generateGitHubResponse(client, formattedMessages, params, streamCallbacks);
    }
  }

  private async streamGitHubResponse(messages: any[], params: ModelParams, callbacks: StreamCallbacks): Promise<string> {
    let fullText = '';

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.token,
        'api-version': '2024-12-01-preview'
      },
      body: JSON.stringify({
        messages,
        ...params,
        model: this.model,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`Streaming request failed: ${response.statusText}`);
    if (!response.body) throw new Error('No response body received for streaming');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data) as StreamingResponse;
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              callbacks.onToken?.(content);
            }
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      }
    }

    callbacks.onComplete?.(fullText);
    return fullText;
  }

  private async generateGitHubResponse(client: any, messages: any[], params: ModelParams, callbacks?: StreamCallbacks): Promise<string> {
    const response = await client.path("/chat/completions").post({
      body: { messages, ...params, model: this.model },
    });

    if (isUnexpected(response)) {
      const errorMsg = 'error' in response.body ? 
        response.body.error?.message || 'Unexpected error occurred' : 
        'Unexpected error occurred';
      throw new Error(errorMsg);
    }

    const responseContent = response.body.choices[0].message.content || '';
    
    if (callbacks?.onToken) callbacks.onToken(responseContent);
    if (callbacks?.onComplete) callbacks.onComplete(responseContent);

    return responseContent;
  }

  async generateResponse(messages: ChatMessage[], streamCallbacks?: StreamCallbacks): Promise<string> {
    if (!this.token && !GROQ_MODELS.includes(this.model)) {
      throw new Error('GitHub token is not configured. Please set the GITHUB_TOKEN environment variable.');
    }

    const cacheKey = this.generateCacheKey(messages, this.model);
    
    if (!streamCallbacks) {
      const cachedData = responseCache.get(cacheKey);
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        return cachedData.response;
      }
    }

    streamCallbacks?.onStart?.();

    try {
      let response: string;

      if (GROQ_MODELS.includes(this.model)) {
        response = await this.handleGroqModel(messages, streamCallbacks);
      } else if (GEMINI_MODELS.includes(this.model)) {
        response = await this.handleGeminiModel(messages, streamCallbacks);
      } else {
        response = await this.handleGitHubModel(messages, streamCallbacks);
      }

      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    } catch (error) {
      streamCallbacks?.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async generateImageResponse(messages: ChatMessage[], imagePath: string, imageFormat: string): Promise<string> {
    return "Image processing is not supported with the GitHub AI models. Please use a text-only query.";
  }

  setModel(modelId: string): void {
    if (modelId) {
      this.model = modelId;
      if (!GROQ_MODELS.includes(modelId) && !this.clientPool.has(modelId)) {
        this.initClient();
      }
      this.clearCache(modelId);
    }
  }

  getCurrentModel(): string {
    return this.model;
  }

  clearCache(modelId?: string): void {
    if (modelId) {
      for (const key of responseCache.keys()) {
        if (key.startsWith(`${modelId}:`)) {
          responseCache.delete(key);
        }
      }
    } else {
      responseCache.clear();
    }
  }
}

const aiService = new AIService();
export default aiService;