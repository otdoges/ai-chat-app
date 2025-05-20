import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import env from "../env";
import { getSystemPrompt } from "../systemPrompt";

// No need for isBrowser check here as we handle it differently

export interface ChatMessage {
  role: "user" | "system" | "assistant" | "developer" | "agent";
  content: string;
}

// Models available from GitHub Marketplace: https://github.com/marketplace/models/
export const availableModels = [
  { id: env.AI_MODELS.OPENAI_GPT_4_1, name: "GPT-4.1" },
  { id: env.AI_MODELS.OPENAI_O4_MINI, name: "O4 Mini" },
  { id: env.AI_MODELS.META_LLAMA_4_MAVERICK, name: "Llama 4 Maverick 17B" },
  { id: env.AI_MODELS.META_LLAMA_3_70B, name: "Llama 3 70B" },
  { id: env.AI_MODELS.META_LLAMA_3_8B, name: "Llama 3 8B" },
  { id: env.AI_MODELS.MISTRAL_MIXTRAL, name: "Mixtral 8x7B" },
  { id: env.AI_MODELS.MISTRAL_SMALL, name: "Mistral Small" },
  { id: env.AI_MODELS.MISTRAL_MEDIUM, name: "Mistral Medium" },
  { id: env.AI_MODELS.MISTRAL_LARGE, name: "Mistral Large" },
  // Gemini models
  { id: env.AI_MODELS.GEMINI_2_0_FLASH, name: "Gemini 2.0 Flash" },
  { id: env.AI_MODELS.GEMINI_2_5_FLASH, name: "Gemini 2.5 Flash" },
  // Grok-3 model
  { id: env.AI_MODELS.GROK_3, name: "Grok-3", description: "xAI's Grok-3 model via GitHub AI Inference", provider: 'github', model: 'xai/grok-3' },
  
  // Phi-4 Mini model
  {
    id: 'phi-4-mini',
    name: 'Phi-4 Mini (GitHub)',
    description: 'Microsoft Phi-4-mini-reasoning model via GitHub AI Inference',
    provider: 'github',
    model: 'microsoft/Phi-4-mini-reasoning',
  },
  // ChatGPT (OpenAI o4-mini) model
  {
    id: 'chatgpt-o4-mini',
    name: 'ChatGPT (OpenAI o4-mini)',
    description: 'OpenAI o4-mini model via GitHub AI Inference',
    provider: 'github',
    model: 'openai/o4-mini',
  },
];

// Function to get model parameters based on model ID
interface ModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// Model-specific parameters for optimal performance
const modelParams: Record<string, ModelParams> = {
  [env.AI_MODELS.OPENAI_GPT_4_1]: { temperature: 0.7, max_tokens: 1000 },
  [env.AI_MODELS.OPENAI_O4_MINI]: { temperature: 0.8, max_tokens: 1000, top_p: 1.0 },
  [env.AI_MODELS.META_LLAMA_4_MAVERICK]: { temperature: 0.7, max_tokens: 2000 },
  [env.AI_MODELS.META_LLAMA_3_70B]: { temperature: 0.7, max_tokens: 1000 },
  [env.AI_MODELS.META_LLAMA_3_8B]: { temperature: 0.8, max_tokens: 800 },
  [env.AI_MODELS.MISTRAL_MIXTRAL]: { temperature: 0.75, max_tokens: 1000 },
  [env.AI_MODELS.MISTRAL_SMALL]: { temperature: 0.8, max_tokens: 800 },
  [env.AI_MODELS.MISTRAL_MEDIUM]: { temperature: 0.7, max_tokens: 1000 },
  [env.AI_MODELS.MISTRAL_LARGE]: { temperature: 0.65, max_tokens: 1200 },
  // Gemini model params for optimal performance
  [env.AI_MODELS.GEMINI_2_0_FLASH]: { temperature: 0.2, max_tokens: 1024 },
  [env.AI_MODELS.GEMINI_2_5_FLASH]: { temperature: 0.2, max_tokens: 1024 },
  ['phi-4-mini']: { temperature: 1.0, max_tokens: 1000, top_p: 1.0 },
  ['chatgpt-o4-mini']: { temperature: 1.0, max_tokens: 1000, top_p: 1.0 },
  // Grok-3 model parameters
  [env.AI_MODELS.GROK_3]: { temperature: 1.0, max_tokens: 1000, top_p: 1.0 },
};

// Function to get the model parameters with defaults
function getModelParams(modelId: string): ModelParams {
  return modelParams[modelId] || { temperature: 0.7, max_tokens: 1000 };
}

// Simple cache for response data
const responseCache = new Map<string, {response: string, timestamp: number}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const CONNECTION_TIMEOUT = 15000; // 15 seconds timeout for connections

class AIService {
  private token: string;
  private endpoint: string;
  private model: string;
  private client: ReturnType<typeof ModelClient> | null = null;
  private clientPool: Map<string, ReturnType<typeof ModelClient>> = new Map();

  constructor() {
    // Use environment config
    this.token = env.GITHUB_TOKEN;
    this.endpoint = env.AI_ENDPOINT;
    this.model = env.AI_MODEL;
    
    if (typeof window === 'undefined') {
      // Only create client on server-side
      this.initClient();
      
      // Pre-initialize clients for commonly used models to reduce cold start time
      this.preInitializeCommonClients();
    }
  }
  
  private preInitializeCommonClients() {
    // Pre-initialize clients for commonly used models
    const commonModels = [
      env.AI_MODELS.OPENAI_GPT_4_1,
      env.AI_MODELS.META_LLAMA_4_MAVERICK,
      env.AI_MODELS.MISTRAL_SMALL
    ];
    
    for (const model of commonModels) {
      if (model !== this.model) { // Skip current model as it's already initialized
        this.getOrCreateClient(model);
      }
    }
  }
  
  private initClient() {
    if (!this.token) return;
    
    this.client = ModelClient(
      this.endpoint,
      new AzureKeyCredential(this.token),
      { 
        apiVersion: "2024-12-01-preview",
        retryOptions: {
          maxRetries: 3,
          retryDelayInMs: 300,
          maxRetryDelayInMs: 2000
        },
        timeout: CONNECTION_TIMEOUT
      }
    );
    
    // Add to client pool
    this.clientPool.set(this.model, this.client);
  }
  
  private getOrCreateClient(modelId: string): ReturnType<typeof ModelClient> {
    // Check if we already have a client for this model
    if (this.clientPool.has(modelId)) {
      return this.clientPool.get(modelId)!;
    }
    
    // Create a new client for this model
    const client = ModelClient(
      this.endpoint,
      new AzureKeyCredential(this.token),
      { 
        apiVersion: "2024-12-01-preview",
        retryOptions: {
          maxRetries: 3,
          retryDelayInMs: 300,
          maxRetryDelayInMs: 2000
        },
        timeout: CONNECTION_TIMEOUT
      }
    );
    
    // Store in the pool
    this.clientPool.set(modelId, client);
    
    return client;
  }
  
  // Create a fresh client with the current settings
  private refreshClient() {
    console.log(`Refreshing client for model: ${this.model}`);
    
    // Remove from client pool
    this.clientPool.delete(this.model);
    
    // Force client recreation by nullifying first
    this.client = null;
    
    // Only create on server-side
    if (typeof window === 'undefined') {
      this.initClient();
    }
  }
  
  // Generate a cache key from messages and model ID
  private generateCacheKey(messages: ChatMessage[], modelId: string): string {
    // Only use the last few messages for caching to avoid too-specific keys
    const lastMessages = messages.slice(-3); // Use last 3 messages for cache key
    const messageString = lastMessages.map(m => `${m.role}:${m.content}`).join('|');
    return `${modelId}:${messageString}`;
  }
  
  // Clear cache for a specific model or all models
  public clearCache(modelId?: string) {
    if (modelId) {
      // Clear cache entries for this model only
      for (const key of responseCache.keys()) {
        if (key.startsWith(`${modelId}:`)) {
          responseCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      responseCache.clear();
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    if (!this.token) {
      throw new Error('GitHub token is not configured. Please set the GITHUB_TOKEN environment variable.');
    }
    
    // Generate a cache key from the messages and model
    const cacheKey = this.generateCacheKey(messages, this.model);
    
    // Check cache for existing response
    const cachedData = responseCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log('Using cached response for', this.model);
      return cachedData.response;
    }
    
    // Initialize client if it doesn't exist yet (server-side)
    if (!this.client) {
      this.initClient();
    }
    
    if (!this.client) {
      throw new Error('Failed to initialize AI client');
    }
    
    // Get client from pool (either the current one or create a model-specific one)
    const client = this.clientPool.get(this.model) || this.getOrCreateClient(this.model);

    try {
      // Use Gemini API if Gemini model is selected
      if (
        this.model === env.AI_MODELS.GEMINI_2_0_FLASH ||
        this.model === env.AI_MODELS.GEMINI_2_5_FLASH
      ) {
        const systemPrompt = getSystemPrompt(this.model);
        const formattedMessages = [
          { role: "user", content: systemPrompt },
          ...messages.map((msg) => ({
            role: msg.role === "agent" ? "user" : msg.role,
            content: msg.content,
          })),
        ];
        const geminiMessages = formattedMessages.map((m) => ({
          role: m.role === "system" ? "user" : m.role, // Gemini only supports user/assistant
          parts: [{ text: m.content }],
        }));
        let modelName = this.model;
        // Map to correct Gemini model names for API v1beta
        if (modelName === 'gemini/2.0-flash') modelName = 'gemini-2.0-flash';
        if (modelName === 'gemini/2.5-flash') modelName = 'gemini-2.5-flash-preview-04-17';
        // For future support, can add more mappings as needed
        const url = `${env.GEMINI_API_URL}/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;
        const body = JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        });
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!resp.ok) {
          const error = await resp.text();
          throw new Error("Gemini API error: " + error);
        }
        const data = await resp.json();
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
          return "No response generated from Gemini.";
        }
        return data.candidates[0].content.parts[0].text;
      }
      // Use Phi-4 Mini model
      else if (this.model === 'phi-4-mini') {
        const token = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN;
        const endpoint = 'https://models.github.ai/inference';
        const model = 'microsoft/Phi-4-mini-reasoning';
        const client = ModelClient(endpoint, new AzureKeyCredential(token));
        const response = await client.path('/chat/completions').post({
          body: {
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: 1.0,
            top_p: 1.0,
            max_tokens: 1000,
            model,
          },
        });
        if (response.body?.error) {
          throw new Error(response.body.error.message || 'GitHub AI model error');
        }
        return response.body.choices[0].message.content;
      }
      // Use ChatGPT (OpenAI o4-mini) model
      else if (this.model === 'chatgpt-o4-mini') {
        const token = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN;
        const endpoint = 'https://models.github.ai/inference';
        const model = 'openai/o4-mini';
        const client = ModelClient(endpoint, new AzureKeyCredential(token), { apiVersion: '2024-12-01-preview' });
        const systemPrompt = getSystemPrompt(this.model);
        const formattedMessages = [
          { role: 'developer', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.role === 'agent' ? 'assistant' : msg.role,
            content: msg.content,
          })),
        ];
        const response = await client.path('/chat/completions').post({
          body: {
            messages: formattedMessages,
            model,
          },
        });
        if (response.body?.error) {
          throw new Error(response.body.error.message || 'GitHub AI model error');
        }
        return response.body.choices[0].message.content;
      }
      // Use xAI Grok-3 model
      else if (this.model === env.AI_MODELS.GROK_3 || this.model === 'xai/grok-3') {
        // Create a fresh token and endpoint for this call
        const token = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN;
        const endpoint = this.endpoint || 'https://models.github.ai/inference';
        const model = 'xai/grok-3';
        
        // Create a dedicated client for Grok
        const grokClient = ModelClient(endpoint, new AzureKeyCredential(token));
        
        const systemPrompt = getSystemPrompt(this.model);
        const formattedMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.role === 'agent' ? 'assistant' : msg.role === 'developer' ? 'user' : msg.role,
            content: msg.content,
          })),
        ];
        
        const params = {
          temperature: 1.0,
          top_p: 1.0,
          max_tokens: 1000
        };
        
        try {
          const response = await grokClient.path('/chat/completions').post({
            body: {
              messages: formattedMessages,
              temperature: params.temperature,
              top_p: params.top_p,
              max_tokens: params.max_tokens,
              model: model
            }
          });
          
          if (isUnexpected(response)) {
            return 'Sorry, there was an issue connecting to the Grok-3 model.';
          }
          
          return response.body.choices[0].message.content || 'No response from Grok-3.';
          
        } catch (error: any) {
          return 'Sorry, there was an error connecting to the Grok-3 model.';
        }
      }
      // Default: Use GitHub AI (Llama, OpenAI, Mistral, etc)
      // Get the system prompt for the current model
      const systemPrompt = getSystemPrompt(this.model);
      
      // Convert any 'agent' role (from our UI) to 'assistant' for the API
      const formattedMessages = [
        // Add the system prompt as the first message
        { role: 'system', content: systemPrompt },
        // Then add all the user messages
        ...messages.map(msg => ({
          role: msg.role === 'agent' ? 'assistant' : msg.role,
          content: msg.content,
        })),
      ];
      
      // Get the optimal parameters for this model
      const params = getModelParams(this.model);
      
      // Speed optimization: adjust parameters for faster responses
      // Lower max_tokens and higher temperature can lead to quicker generations
      const speedOptimizedParams = {
        ...params,
        max_tokens: Math.min(params.max_tokens || 1000, 600), // Cap max tokens for faster response
        presence_penalty: 0.1, // Slight presence penalty often speeds up generation
        frequency_penalty: 0.1, // Slight frequency penalty often speeds up generation
      };
      
      console.log(`Using model: ${this.model} with system prompt: ${systemPrompt.substring(0, 50)}...`);
      console.log(`Model parameters: temperature=${speedOptimizedParams.temperature}, max_tokens=${speedOptimizedParams.max_tokens}`);
      
      // Use the model-specific client from the pool
      const response = await client.path("/chat/completions").post({
        body: {
          messages: formattedMessages,
          ...speedOptimizedParams, // Apply speed-optimized parameters
          model: this.model
        },
        tracingOptions: {
          tracingId: `model_request_${Date.now()}` // Add tracing for performance monitoring
        }
      });

      if (isUnexpected(response)) {
        console.error('API Error:', response.body);
        // Handle error response properly with typechecking
        const errorMsg = 'error' in response.body ? 
          response.body.error?.message || 'Unexpected error occurred' : 
          'Unexpected error occurred';
        throw new Error(errorMsg);
      }

      // Ensure we have a valid response with content by properly type checking
      if (!isUnexpected(response) && 
          (!response.body.choices || 
           response.body.choices.length === 0 || 
           !response.body.choices[0].message)) {
        return 'No response generated from the model.';
      }
      
      const responseContent = response.body.choices[0].message.content || '';
      
      // Cache the response for future use
      responseCache.set(cacheKey, {
        response: responseContent,
        timestamp: Date.now()
      });
      
      return responseContent;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async generateImageResponse(messages: ChatMessage[], imagePath: string, imageFormat: string): Promise<string> {
    // Using GitHub AI models doesn't currently support image processing
    // Instead we'll return a message indicating this limitation
    return "Image processing is not supported with the GitHub AI models. Please use a text-only query.";
  }
  
  setModel(modelId: string): void {
    // Ensure we don't assign null to the model property
    if (modelId) {
      console.log(`Changing model from ${this.model} to ${modelId}`);
      this.model = modelId;
      
      // Check if we already have a client for this model in the pool
      if (!this.clientPool.has(modelId)) {
        // Initialize a new client for this model
        this.client = this.getOrCreateClient(modelId);
      } else {
        // Use existing client from pool
        this.client = this.clientPool.get(modelId)!;
      }
    }
  }
  
  getCurrentModel(): string {
    return this.model;
  }
}

// Export a singleton instance
const aiService = new AIService();
export default aiService;
