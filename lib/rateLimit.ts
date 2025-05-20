// Simple in-memory rate limiter
// Stores rate limit information on the server

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = {
  [key: string]: RateLimitEntry;
};

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly limit: number;
  private readonly windowMs: number;
  
  constructor(limit: number = 10, windowMs: number = 60 * 1000) {
    this.limit = limit;
    this.windowMs = windowMs;
    
    // Clean up expired entries every minute
    if (typeof window === 'undefined') { // Only run on server
      setInterval(() => this.cleanup(), 60 * 1000);
    }
  }
  
  /**
   * Check if a key has exceeded its rate limit
   * @param key - Identifier for the client (e.g., IP address)
   * @returns Object containing limit info and whether the request is allowed
   */
  check(key: string): { 
    success: boolean; 
    limit: number; 
    remaining: number; 
    resetAt: Date; 
    retryAfter?: number 
  } {
    this.cleanup(); // Clean up expired entries
    
    const now = Date.now();
    const resetAt = now + this.windowMs;
    
    // Initialize or reset the entry if it has expired
    if (!this.store[key] || this.store[key].resetAt < now) {
      this.store[key] = {
        count: 0,
        resetAt
      };
    }
    
    // Increment the counter
    this.store[key].count += 1;
    
    const entry = this.store[key];
    const remaining = Math.max(0, this.limit - entry.count);
    const success = entry.count <= this.limit;
    
    // Calculate retry after in seconds if rate limited
    const retryAfter = success ? undefined : Math.ceil((entry.resetAt - now) / 1000);
    
    return {
      success,
      limit: this.limit,
      remaining,
      resetAt: new Date(entry.resetAt),
      ...(retryAfter && { retryAfter })
    };
  }
  
  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetAt < now) {
        delete this.store[key];
      }
    }
  }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to extract IP from request
export function getClientIdentifier(req: Request): string {
  const headers = new Headers(req.headers);
  
  // Try to get forwarded IP first (if behind a proxy)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Use the first IP in the list
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to other headers or the connecting IP
  return headers.get('x-real-ip') || 
         headers.get('x-client-ip') || 
         'unknown-client';
}
