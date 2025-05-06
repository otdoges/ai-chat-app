import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import env from "../env";
import { getSystemPrompt } from "../systemPrompt";
import { experimental_AzureOpenAI as AzureOpenAI } from "@vercel/ai/azure";

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
};

// Function to get the model parameters with defaults
function getModelParams(modelId: string): ModelParams {
  return modelParams[modelId] || { temperature: 0.7, max_tokens: 1000 };
}

class AIService {
  private token: string;
  private endpoint: string;
  private model: string;
  private client: ReturnType<typeof ModelClient> | null = null;
  private azureClient: any | null = null;

  constructor() {
    // Use environment config
    this.token = env.GITHUB_TOKEN;
    this.endpoint = env.AI_ENDPOINT;
    this.model = env.AI_MODEL;
    
    if (typeof window === 'undefined') {
      // Only create client on server-side
      this.initClient();
    }
  }
  
  private initClient() {
    if (!this.token) return;
    
    this.client = ModelClient(
      this.endpoint,
      new AzureKeyCredential(this.token),
      { apiVersion: "2024-12-01-preview" }
    );
    
    // Use AzureOpenAI from Vercel AI SDK if available
    this.azureClient = new AzureOpenAI({
      apiKey: this.token,
      baseURL: this.endpoint,
      defaultModel: this.model,
    });
  }
  
  // Create a fresh client with the current settings
  private refreshClient() {
    console.log(`Refreshing client for model: ${this.model}`);
    
    // Force client recreation by nullifying first
    this.client = null;
    this.azureClient = null;
    
    // Only create on server-side
    if (typeof window === 'undefined') {
      this.initClient();
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    if (!this.token) {
      throw new Error('GitHub token is not configured. Please set the GITHUB_TOKEN environment variable.');
    }
    
    // Initialize client if it doesn't exist yet (server-side)
    if (!this.client) {
      this.initClient();
    }
    
    if (!this.client) {
      throw new Error('Failed to initialize AI client');
    }

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
      
      console.log(`Using model: ${this.model} with system prompt: ${systemPrompt.substring(0, 50)}...`);
      console.log(`Model parameters: temperature=${params.temperature}, max_tokens=${params.max_tokens}`);
      
      const response = await this.client.path("/chat/completions").post({
        body: {
          messages: formattedMessages,
          ...params, // Apply model-specific parameters
          model: this.model
        }
      });

      if (isUnexpected(response)) {
        throw new Error(response.body.error?.message || 'Unexpected error occurred');
      }

      // Ensure we have a valid response with content
      if (!response.body.choices || response.body.choices.length === 0 || !response.body.choices[0].message) {
        return 'No response generated from the model.';
      }
      
      return response.body.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async generateImageResponse(messages: ChatMessage[], imagePath: string, imageFormat: string): Promise<string> {
    if (!this.token) {
      throw new Error('GitHub token is not configured. Please set the GITHUB_TOKEN environment variable.');
    }
    if (!this.azureClient) {
      this.initClient();
    }
    if (!this.azureClient) {
      throw new Error('Failed to initialize Azure AI client');
    }
    // Read image as base64
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/${imageFormat};base64,${imageBase64}`;
    const formattedMessages = [
      { role: 'system', content: 'You are a helpful assistant that describes images in detail.' },
      { role: 'user', content: [
        { type: 'text', text: "What's in this image?" },
        { type: 'image_url', image_url: { url: dataUrl, details: 'low' } }
      ] }
    ];
    const response = await this.azureClient.chat.completions.create({
      messages: formattedMessages,
      model: this.model
    });
    return response.choices[0].message.content;
  }
  
  setModel(modelId: string): void {
    // Ensure we don't assign null to the model property
    if (modelId) {
      console.log(`Changing model from ${this.model} to ${modelId}`);
      this.model = modelId;
      
      // Refresh the client to ensure it uses the new model settings
      this.refreshClient();
    }
  }
  
  getCurrentModel(): string {
    return this.model;
  }
}

// Export a singleton instance
const aiService = new AIService();
export default aiService;
