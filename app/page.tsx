import Link from "next/link";
import { ArrowRight, MessageSquare, Zap, Sparkles, Github } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="relative">
          {/* Background decorative elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          {/* Main content */}
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="animate-fade-in bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              AI Chat App
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Experience conversations with state-of-the-art AI models in one place
            </p>
            
            {/* CTA buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link 
                href="/chat" 
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-primary/20 md:text-base"
              >
                Start Chatting
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="https://github.com/otdoges/ai-chat-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground shadow-lg transition-all hover:bg-muted md:text-base"
              >
                <Github className="h-4 w-4" />
                Report an Issue
              </a>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Multiple AI Models</h3>
            <p className="text-muted-foreground">
              Switch between Gemini, Llama, OpenAI, and Mistral models with a single click.
            </p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Fast Responses</h3>
            <p className="text-muted-foreground">
              Get instant AI responses with our optimized API integration and caching system.
            </p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Modern Interface</h3>
            <p className="text-muted-foreground">
              Enjoy a clean, responsive design with dark mode support and intuitive controls.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center justify-center space-y-2">
            <a 
              href="https://github.com/otdoges/ai-chat-app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center hover:text-foreground"
            >
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </a>
            <div className="flex items-center space-x-4">
              <Link href="/privacy-policy" className="hover:text-foreground">
                Privacy Policy
              </Link>
            </div>
            <p>© {new Date().getFullYear()} AI Chat App. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}