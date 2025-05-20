import { NextRequest, NextResponse } from 'next/server';
import aiService, { StreamCallbacks } from '@/lib/services/aiService';
import { rateLimiter, getClientIdentifier } from '@/lib/rateLimit';

// Helper function to create a text-event-stream response
function createStreamResponse() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Make these callbacks available to be called from outside
      streamCallbacks.onToken = (token: string) => {
        const payload = JSON.stringify({ token });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };
      
      streamCallbacks.onComplete = (fullText: string) => {
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      };
      
      streamCallbacks.onError = (error: Error) => {
        const payload = JSON.stringify({ error: error.message });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        controller.close();
      };
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Initialize streaming callbacks
const streamCallbacks: StreamCallbacks = {
  onStart: () => {},
  onToken: () => {},
  onComplete: () => {},
  onError: () => {},
};

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimitResult = rateLimiter.check(clientId);
    
    // If rate limit exceeded, return 429 Too Many Requests
    if (!rateLimitResult.success) {
      console.warn('Rate limit exceeded for client:', clientId);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt.toISOString(),
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
            ...(rateLimitResult.retryAfter && { 'Retry-After': rateLimitResult.retryAfter.toString() })
          }
        }
      );
    }

    const body = await req.json();
    const { messages, modelId, stream } = body;
    
    if (!messages || !Array.isArray(messages)) {
      console.warn('Invalid request body:', body);
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Set the model before generating a response
    if (modelId) {
      aiService.setModel(modelId);
    }

    // Check Accept header for streaming preference
    const acceptHeader = req.headers.get('accept') || '';
    const requestsStream = stream === true || acceptHeader.includes('text/event-stream');
    
    // Handle streaming response
    if (requestsStream) {
      console.log(`Generating streaming response with model: ${modelId || 'default'}`);
      
      // Create and return a streaming response
      const streamResponse = createStreamResponse();
      
      // Process asynchronously
      (async () => {
        try {
          // This will feed data through the stream callbacks
          await aiService.generateResponse(messages, streamCallbacks);
        } catch (error: any) {
          console.error('Error in streaming response:', error);
          // Error will be handled by the onError callback
        }
      })();
      
      return streamResponse;
    }
    
    // Standard non-streaming response
    console.log(`Generating response with model: ${modelId || 'default'}`);
    const response = await aiService.generateResponse(messages);
    
    // Add rate limit headers to successful response
    return NextResponse.json(
      { 
        message: {
          role: 'assistant',
          content: response,
          timestamp: new Date().toLocaleTimeString()
        }
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
        }
      }
    );
  } catch (error: any) {
    // Log the detailed error on the server
    console.error('Error in /api/chat/route.ts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message || 'Unknown error' }, 
      { status: 500 }
    );
  }
}
