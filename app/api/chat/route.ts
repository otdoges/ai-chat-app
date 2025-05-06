import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/services/aiService';
import { rateLimiter, getClientIdentifier } from '@/lib/rateLimit';

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
    const { messages, modelId } = body;
    
    if (!messages || !Array.isArray(messages)) {
      console.warn('Invalid request body:', body);
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Set the model before generating a response (for Gemini and all models)
    if (modelId) {
      aiService.setModel(modelId);
    }

    // Get response from the selected model
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
