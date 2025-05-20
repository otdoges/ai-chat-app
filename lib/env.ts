// Environment variables with default values
const env = {
  // GitHub AI model settings
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  AI_ENDPOINT: process.env.AI_ENDPOINT || 'https://models.github.ai/inference',
  
  // Default model
  AI_MODEL: process.env.AI_MODEL || 'meta/Llama-4-Maverick-17B-128E-Instruct-FP8',
  
  // All available models
  AI_MODELS: {
    OPENAI_GPT_4_1: process.env.AI_MODEL_OPENAI_GPT_4_1 || 'openai/gpt-4.1',
    OPENAI_O4_MINI: process.env.AI_MODEL_OPENAI_O4_MINI || 'openai/o4-mini',
    META_LLAMA_4_MAVERICK: process.env.AI_MODEL_META_LLAMA_4_MAVERICK || 'meta/Llama-4-Maverick-17B-128E-Instruct-FP8',
    META_LLAMA_3_70B: process.env.AI_MODEL_META_LLAMA_3_70B || 'meta/llama-3-70b-instruct',
    META_LLAMA_3_8B: process.env.AI_MODEL_META_LLAMA_3_8B || 'meta/llama-3-8b-instruct',
    MISTRAL_MIXTRAL: process.env.AI_MODEL_MISTRAL_MIXTRAL || 'mistralai/mixtral-8x7b-instruct',
    MISTRAL_SMALL: process.env.AI_MODEL_MISTRAL_SMALL || 'mistralai/mistral-small',
    MISTRAL_MEDIUM: process.env.AI_MODEL_MISTRAL_MEDIUM || 'mistralai/mistral-medium',
    MISTRAL_LARGE: process.env.AI_MODEL_MISTRAL_LARGE || 'mistralai/mistral-large',
    // Gemini models
    GEMINI_2_0_FLASH: process.env.AI_MODEL_GEMINI_2_0_FLASH || 'gemini/2.0-flash',
    GEMINI_2_5_FLASH: process.env.AI_MODEL_GEMINI_2_5_FLASH || 'gemini/2.5-flash',
    // xAI Grok model
    GROK_3: process.env.AI_MODEL_GROK_3 || 'xai/grok-3',
  },
  // Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
};

export default env;
