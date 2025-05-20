'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Download, ThumbsUp, ThumbsDown, Loader2, Info, Code as CodeIcon, Send, Trash2, MessageSquare, Bot, Github } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import dbService from "@/lib/services/db"
import { ModelSelector } from "@/components/model-selector"
import aiService, { availableModels } from "@/lib/services/aiService"
import { getSystemPromptDescription } from "@/lib/systemPrompt"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Rating } from "@/components/ui/rating"

interface Message {
  id?: string
  role: "agent" | "user"
  content: string
  timestamp: string
  modelId?: string // Track which model created this message
  rating?: number // 1-5 star rating
  feedback?: string // Optional user feedback
}

// Helper function to detect and format code blocks
function formatMessageContent(content: string) {
  // Split the content by code block markers ```
  const parts = content.split(/(```[\w\s]*\n[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    // Check if this part is a code block
    if (part.startsWith('```')) {
      // Extract the language (if specified) and the code content
      const match = part.match(/```([\w\s]*)\n([\s\S]*?)```/);
      if (match) {
        const [_, language, code] = match;
        // Determine language for syntax highlighting
        const lang = language.trim().toLowerCase() || 'text';
        return (
          <div key={index} className="relative my-2 rounded-md overflow-hidden">
            <div className="flex items-center justify-between bg-zinc-800 dark:bg-zinc-900 text-white px-4 py-1 text-xs">
              <span>{language.trim() || 'Code'}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-zinc-400 hover:text-white" 
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success('Code copied to clipboard');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="bg-zinc-950 dark:bg-black overflow-x-auto text-zinc-200 text-sm">
              <SyntaxHighlighter 
                language={lang} 
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  backgroundColor: 'transparent',
                  fontSize: '0.875rem',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'var(--font-mono)',
                  }
                }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }
    }
    
    // Process inline code blocks with backticks
    if (part.includes('`') && !part.startsWith('```')) {
      // Handle inline code styling
      const inlineParts = part.split(/(`[^`]+`)/g);
      return (
        <span key={index}>
          {inlineParts.map((inlinePart, i) => {
            if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
              return (
                <code key={i} className="px-1.5 py-0.5 mx-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-sm font-mono">
                  {inlinePart.slice(1, -1)}
                </code>
              );
            }
            return inlinePart;
          })}
        </span>
      );
    }
    
    // Regular text - split and process by paragraph
    return part.split('\n\n').map((paragraph, i) => {
      if (!paragraph.trim()) return null;
      return <p key={`${index}-${i}`} className="mb-2">{paragraph}</p>;
    });
  });
}

export default function ChatInterface() {
  const [input, setInput] = useState("")
  const [currentModel, setCurrentModel] = useState(aiService.getCurrentModel())
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [ratings, setRatings] = useState<{ [id: string]: { rating: number, feedback: string } }>({});

  // Use useEffect to handle client-side only operations
  useEffect(() => {
    setIsClient(true)
    
    // Initialize with welcome message after component mounts on client
    setMessages([
      {
        role: "agent",
        content: "Hello, I am a generative AI agent powered by GitHub Marketplace models. How may I assist you today?",
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
    
    // Load messages from IndexedDB
    const loadMessages = async () => {
      try {
        // Get messages for the current model
        const savedMessages = await dbService.getMessagesByModel(currentModel)
        console.log(`Loaded ${savedMessages.length} messages for model ${currentModel}`)
        
        // Create welcome message for this model
        const welcomeMessage: Message = {
          role: "agent",
          content: `Hello, I am now using the ${availableModels.find(m => m.id === currentModel)?.name || currentModel} model. How may I assist you today?`,
          timestamp: new Date().toLocaleTimeString(),
          modelId: currentModel // Track which model created this message
        }
        
        // Set messages with model-specific welcome message + any saved messages for this model
        setMessages(savedMessages.length > 0 
          ? [welcomeMessage, ...savedMessages] 
          : [welcomeMessage]
        )
      } catch (error) {
        console.error('Error loading messages:', error)
        toast.error('Failed to load previous messages')
      }
    }
    
    loadMessages()
  }, [currentModel]) // Reload when model changes
  
  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  // Function to send a message to the AI model
  const sendMessage = async () => {
    if (!input.trim()) return
    
    // Create new user message
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString(),
      modelId: currentModel // Associate with current model
    }
    
    // Update UI with user message
    setMessages((prev: Message[]) => [...prev, userMessage])
    
    // Save user message to IndexedDB
    await dbService.addMessage(userMessage)
    
    // Clear input field
    setInput("")
    
    // Set loading state
    setIsLoading(true)
    
    try {
      // POST both messages and modelId to ensure backend uses correct model
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          modelId: currentModel,
        }),
      })
      
      // Handle error responses with specific messages to the client
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to get response from AI';
        
        // Add an error message from the AI in the chat
        const errorAiMessage: Message = {
          role: "agent",
          content: `⚠️ Error: ${errorMessage}\n\nIf this issue persists, please [report it on GitHub](https://github.com/username/ai-chat-app/issues/new?title=Error:+${encodeURIComponent(errorMessage)})`,
          timestamp: new Date().toLocaleTimeString(),
          modelId: currentModel
        }
        
        // Update UI with error message
        setMessages((prev: Message[]) => [...prev, errorAiMessage])
        await dbService.addMessage(errorAiMessage)
        
        // Also show as toast
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      const aiMessage: Message = {
        role: "agent",
        content: data.message.content,
        timestamp: new Date().toLocaleTimeString(),
        modelId: currentModel // Associate with current model
      }
      
      // Update UI with AI response
      setMessages((prev: Message[]) => [...prev, aiMessage])
      
      // Save AI message to IndexedDB
      await dbService.addMessage(aiMessage)
      
    } catch (error: any) {
      console.error('Error sending message:', error)
      // Only show toast if we haven't already shown a more specific message
      if (!error.message || error.message === 'Failed to fetch') {
        toast.error('Network error: Unable to connect to the AI service')
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handler for Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Handle model change
  const handleModelChange = (modelId: string) => {
    if (modelId === currentModel) return; // Don't switch if already on this model
    
    // Update model in service
    aiService.setModel(modelId);
    
    // Update current model state - this will trigger the useEffect to load model-specific messages
    setCurrentModel(modelId);
    
    // Display a success message when model is changed
    toast.success(`Switched to ${availableModels.find(m => m.id === modelId)?.name || modelId} model`);
  };
  
  // Function to clear chat history for current model
  const clearChatHistory = async () => {
    try {
      // Clear from database
      await dbService.clearMessagesByModel(currentModel);
      
      // Create new welcome message
      const welcomeMessage: Message = {
        role: "agent",
        content: `Chat history cleared. I am using the ${availableModels.find(m => m.id === currentModel)?.name || currentModel} model. How may I assist you today?`,
        timestamp: new Date().toLocaleTimeString(),
        modelId: currentModel
      };
      
      // Reset messages to just the welcome message
      setMessages([welcomeMessage]);
      
      toast.success("Chat history cleared");
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast.error('Failed to clear chat history');
    }
  };
  
  const handleRateMessage = async (id: string, rating: number, feedback: string = "") => {
    setRatings(prev => ({ ...prev, [id]: { rating, feedback } }));
    setMessages(prevMsgs => prevMsgs.map(msg =>
      msg.id === id ? { ...msg, rating, feedback } : msg
    ));
    // Persist rating to IndexedDB
    if (id && typeof id === 'string' && id.startsWith('temp-id-') === false) {
      await dbService.updateMessageRating(id, rating, feedback);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center w-full mb-2">
            <h1 className="text-lg font-bold md:text-xl">AI Chat Assistant</h1>
          </div>
          <ModelSelector 
            onModelChange={handleModelChange}
            currentModel={currentModel}
          />
        </div>
        
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
          <Badge variant="outline" className="px-2 py-0.5 md:px-3 md:py-1 bg-primary/10 border-primary/20 text-xs md:text-sm font-medium">
            {availableModels.find(m => m.id === currentModel)?.name || currentModel}
          </Badge>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 bg-muted rounded-full text-xs text-muted-foreground cursor-help truncate max-w-[180px] md:max-w-none">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{getSystemPromptDescription(currentModel)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] md:max-w-sm">
                <p>This model is optimized with a specific system prompt for better performance.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="w-full text-center text-xs text-muted-foreground mt-1 md:mt-2">
            <span className="font-medium">Model ID:</span> {currentModel}
          </div>
        </div>
        
        <div className="mt-2 flex flex-col gap-2 items-center">
          <div className="text-xs text-muted-foreground text-center">
            All models are from the <a href="https://github.com/marketplace/models/" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80 transition-colors">GitHub Marketplace</a>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearChatHistory}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-1.5 border-red-200 dark:border-red-900/30"
          >
            <Trash2 className="h-3 w-3" />
            <span className="md:inline">Clear Chat History</span>
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 px-2 md:px-4 py-4 md:py-6" ref={scrollAreaRef}>
        <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
          {isClient && messages.map((msg, i) => (
            <div key={msg.id || i} className="mb-4">
              <Card
                className={cn(
                  "border shadow-sm",
                  msg.role === "user" 
                    ? "border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10" 
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                )}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    {msg.role === "agent" ? (
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                        <Bot className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">You</div>
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {msg.role === "agent" ? "AI Assistant" : "You"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm break-words">
                    {formatMessageContent(msg.content)}
                  </div>
                  
                  {msg.role === "agent" && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {/* Add a button to report issues to GitHub */}
                      {msg.role === "agent" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                onClick={() => {
                                  window.open(
                                    `https://github.com/username/ai-chat-app/issues/new?title=Issue+with+${currentModel}+response&body=${encodeURIComponent(
                                      `## Model\n${currentModel}\n\n## Response\n${msg.content}\n\n## Description\nPlease describe the issue:\n\n`
                                    )}`,
                                    '_blank'
                                  )
                                  toast.success('Opening GitHub issue form')
                                }}
                              >
                                <Github className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>Report an issue with this response</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 md:h-8 md:w-8 rounded-full p-0" 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          toast.success("Message copied to clipboard");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 rounded-full p-0">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 md:h-8 md:w-8 rounded-full p-0 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 md:h-8 md:w-8 rounded-full p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              {msg.role === "agent" && (
                <div className="mt-2 flex flex-col gap-2">
                  <Rating
                    value={ratings[msg.id || i]?.rating || msg.rating || 0}
                    onChange={val => handleRateMessage(msg.id || i.toString(), val, ratings[msg.id || i]?.feedback || msg.feedback || "")}
                  />
                  <Textarea
                    className="mt-1"
                    placeholder="Leave feedback (optional)"
                    value={ratings[msg.id || i]?.feedback || msg.feedback || ""}
                    onChange={e => handleRateMessage(msg.id || i.toString(), ratings[msg.id || i]?.rating || msg.rating || 0, e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 md:p-4 border-t bg-white dark:bg-gray-950 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex gap-1 md:gap-2 max-w-3xl mx-auto">
          <Textarea
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[48px] md:min-h-[54px] max-h-32 md:max-h-40 border-gray-300 dark:border-gray-700 focus:border-primary dark:focus:border-primary resize-none shadow-sm text-sm md:text-base"
            disabled={isLoading}
          />
          <Button 
            className="px-3 md:px-4 h-[48px] md:h-[54px] gap-1 md:gap-2 flex-shrink-0" 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden md:inline">Send</span>
              </>
            )}
          </Button>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-1 md:mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}
