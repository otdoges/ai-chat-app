import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageSquare, Zap, Sparkles, Github } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#121212] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-10 border-b border-[#2a2a2a]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#6D5DFC] to-[#5136D9]" />
            <span className="text-xl font-bold">AI Chat</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#demo" className="text-gray-300 hover:text-white transition-colors">
              Demo
            </Link>
            <a 
              href="https://github.com/otdoges/ai-chat-app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
          <Link 
            href="/chat" 
            className="bg-gradient-to-r from-[#6D5DFC] to-[#5136D9] px-5 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Background Elements */}
        <div className="absolute top-10 right-10 md:top-20 md:right-36">
          <div className="relative w-20 h-20 md:w-32 md:h-32">
            <Image src="/images/blob-circle.svg" alt="Decorative blob" fill priority />
          </div>
        </div>
        <div className="absolute -bottom-16 -left-16 md:-bottom-32 md:-left-32">
          <div className="relative w-48 h-48 md:w-80 md:h-80">
            <Image src="/images/blob-purple.svg" alt="Decorative blob" fill priority />
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6D5DFC] to-[#3B82F6]">
                Chat with advanced AI models
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Experience the power of Grok-3, Gemini, and other top AI models in one beautiful, intuitive interface.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/chat" 
                className="w-full sm:w-auto bg-gradient-to-r from-[#6D5DFC] to-[#5136D9] px-8 py-4 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center"
              >
                Start Chatting
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a 
                href="#demo" 
                className="w-full sm:w-auto bg-[#1A1A1A] border border-[#2a2a2a] px-8 py-4 rounded-xl font-medium text-lg hover:bg-[#222] transition-colors flex items-center justify-center mt-4 sm:mt-0"
              >
                See Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Demo Section */}
      <section id="demo" className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              <div className="absolute -top-16 right-0 transform rotate-12 hidden md:block">
                <div className="relative w-32 h-32">
                  <Image src="/images/blob-square.svg" alt="Decorative shape" fill />
                </div>
              </div>
              
              {/* Chat UI Image */}
              <div className="bg-[#0f0f0f] p-4 rounded-2xl border border-[#2a2a2a] shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
                <div className="hidden md:block">
                  <Image 
                    src="/images/chat-ui-simple.svg" 
                    alt="AI Chat Interface" 
                    width={600} 
                    height={800} 
                    className="rounded-lg w-full"
                  />
                </div>
                <div className="md:hidden">
                  <Image 
                    src="/images/chat-ui-simple-mobile.svg" 
                    alt="AI Chat Interface Mobile" 
                    width={360} 
                    height={700} 
                    className="rounded-lg w-full"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">Chat with Grok-3, Gemini, and other state-of-the-art AI models</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-[#0f0f0f]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6D5DFC] to-[#3B82F6]">
                Powerful Features
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Everything you need for amazing AI conversations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-[#2a2a2a] transform hover:translate-y-[-8px] transition-transform duration-300">
              <div className="mb-6">
                <Image 
                  src="/images/feature-models.svg" 
                  alt="Multiple AI Models" 
                  width={120} 
                  height={120} 
                  className="mx-auto"
                />
              </div>
              <h3 className="text-xl font-bold mb-4 text-center">Multiple AI Models</h3>
              <p className="text-gray-400 text-center">
                Choose from a variety of cutting-edge AI models including Grok-3, Gemini, and more with just one click.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-[#2a2a2a] transform hover:translate-y-[-8px] transition-transform duration-300">
              <div className="mb-6">
                <Image 
                  src="/images/feature-speed.svg" 
                  alt="Fast Responses" 
                  width={120} 
                  height={120} 
                  className="mx-auto"
                />
              </div>
              <h3 className="text-xl font-bold mb-4 text-center">Lightning Fast</h3>
              <p className="text-gray-400 text-center">
                Get instant AI responses with our optimized streaming API integration that delivers results in real-time.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-[#2a2a2a] transform hover:translate-y-[-8px] transition-transform duration-300">
              <div className="mb-6">
                <Image 
                  src="/images/feature-ui.svg" 
                  alt="Modern Interface" 
                  width={120} 
                  height={120} 
                  className="mx-auto"
                />
              </div>
              <h3 className="text-xl font-bold mb-4 text-center">Beautiful Interface</h3>
              <p className="text-gray-400 text-center">
                Enjoy a clean, responsive design with dark mode support and intuitive controls for the best experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#6D5DFC]/10 to-transparent opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Ready to start chatting with the best AI models?
            </h2>
            <Link 
              href="/chat" 
              className="inline-block bg-gradient-to-r from-[#6D5DFC] to-[#5136D9] px-8 py-4 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity"
            >
              Launch AI Chat App
            </Link>
            <p className="mt-6 text-gray-400">
              No signup required. Just click and start chatting.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0A0A] border-t border-[#2a2a2a] py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#6D5DFC] to-[#5136D9]" />
              <span className="text-xl font-bold">AI Chat</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 mb-4 md:mb-0">
              <Link href="#features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#demo" className="text-gray-400 hover:text-white transition-colors">
                Demo
              </Link>
              <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <a 
                href="https://github.com/otdoges/ai-chat-app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors flex items-center"
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </div>
            <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} AI Chat App
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}