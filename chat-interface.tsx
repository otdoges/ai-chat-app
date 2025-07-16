'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Download, ThumbsUp, ThumbsDown, Loader2, Info, Code as CodeIcon, Send, Trash2, MessageSquare, Bot, Github, Brain, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import dbService from "@/lib/services/db"
import { ModelSelector } from "@/components/model-selector"
import aiService, { availableModels } from "@/lib/services/aiService"
import { getSystemPromptDescription, hasCustomSystemPrompt } from "@/lib/systemPrompt"
import CustomSystemPrompt from "@/components/custom-system-prompt"
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
  reasoning?: string // Reasoning content for models that support it
}

// Memoized helper function to detect and format code blocks
const FormatMessageContent = React.memo(({ content }: { content: string }) => {
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
});
FormatMessageContent.displayName = "FormatMessageContent";

// Reasoning display component
const ReasoningDisplay = React.memo(({ reasoning }: { reasoning: string }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  if (!reasoning?.trim()) return null
  
  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="font-medium">View Reasoning Process</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Model Reasoning
              </span>
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
              {reasoning.split('\n---\n').map((section, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {section.trim()}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
})
ReasoningDisplay.displayName = "ReasoningDisplay";

// Memoized message component for performance
const MessageCard = React.memo(({ 
  msg, 
  currentModel, 
  ratings, 
  handleRateMessage 
}: {
  msg: Message;
  currentModel: string;
  ratings: { [id: string]: { rating: number, feedback: string } };
  handleRateMessage: (id: string, rating: number, feedback: string) => void;
}) => {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Message copied to clipboard");
  }, [msg.content]);

  const handleGithubReport = useCallback(() => {
    window.open(
      `https://github.com/username/ai-chat-app/issues/new?title=Issue+with+${currentModel}+response&body=${encodeURIComponent(
        `## Model\n${currentModel}\n\n## Response\n${msg.content}\n\n## Description\nPlease describe the issue:\n\n`
      )}`,
      '_blank'
    );
    toast.success('Opening GitHub issue form');
  }, [currentModel, msg.content]);

  return (
    <div className="mb-4">
      <Card
        className={cn(
          "border shadow-sm transition-all duration-200 hover:shadow-md",
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
            <FormatMessageContent content={msg.content} />
          </div>
          
          {/* Reasoning display for agent messages with reasoning */}
          {msg.role === "agent" && msg.reasoning && (
            <ReasoningDisplay reasoning={msg.reasoning} />
          )}
          
          {msg.role === "agent" && (
            <div className="flex items-center gap-1.5 mt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      onClick={handleGithubReport}
                    >
                      <Github className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Report an issue with this response</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 md:h-8 md:w-8 rounded-full p-0" 
                onClick={handleCopy}
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
            value={ratings[msg.id || 0]?.rating || msg.rating || 0}
            onChange={val => handleRateMessage(msg.id || '0', val, ratings[msg.id || 0]?.feedback || msg.feedback || "")}
          />
          <Textarea
            className="mt-1"
            placeholder="Leave feedback (optional)"
            value={ratings[msg.id || 0]?.feedback || msg.feedback || ""}
            onChange={e => handleRateMessage(msg.id || '0', ratings[msg.id || 0]?.rating || msg.rating || 0, e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
});
MessageCard.displayName = "MessageCard";

export default function ChatInterface() {
  const [input, setInput] = useState("")
  const [currentModel, setCurrentModel] = useState(aiService.getCurrentModel())
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [ratings, setRatings] = useState<{ [id: string]: { rating: number, feedback: string } }>({});
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false)
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false)

  // Memoized unique messages to prevent duplicates and improve performance
  const uniqueMessages = useMemo(() => 
    messages.filter((msg, index, arr) => 
      index === arr.findIndex(m => m.id === msg.id || (m.content === msg.content && m.timestamp === msg.timestamp))
    ), [messages]
  );

  // Use useEffect to handle client-side only operations
  useEffect(() => {
    setIsClient(true)
    setHasCustomPrompt(hasCustomSystemPrompt())
    
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

  // Memoized message sending function
  const sendMessage = useCallback(async () => {
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
    
    // Create a temporary ID for the streaming message
    const tempMessageId = `temp-id-${Date.now()}`
    
    // Add a placeholder message for the streaming response
    const placeholderMessage: Message = {
      id: tempMessageId,
      role: "agent",
      content: "", // Start with empty content
      timestamp: new Date().toLocaleTimeString(),
      modelId: currentModel
    }
    
    // Add the placeholder to the UI
    setMessages((prev: Message[]) => [...prev, placeholderMessage])
    
    try {
      // Use streaming endpoint for faster responses
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream' // Request streaming response
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          modelId: currentModel,
          stream: true // Request streaming
        }),
      })
      
      // Handle error responses with specific messages to the client
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to get response from AI';
        
        // Update the placeholder with error message
        const errorContent = `⚠️ Error: ${errorMessage}\n\nIf this issue persists, please [report it on GitHub](https://github.com/username/ai-chat-app/issues/new?title=Error:+${encodeURIComponent(errorMessage)})`
        
        setMessages((prev: Message[]) => 
          prev.map(msg => 
            msg.id === tempMessageId 
              ? {...msg, content: errorContent} 
              : msg
          )
        )
        
        // Save error message to IndexedDB
        const finalErrorMessage: Message = {
          role: "agent",
          content: errorContent,
          timestamp: new Date().toLocaleTimeString(),
          modelId: currentModel
        }
        await dbService.addMessage(finalErrorMessage)
        
        // Also show as toast
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
      
      // If response is OK, check if it's a streaming response
      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        // Process the stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedResponse = ''
        
        if (reader) {
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              
              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n').filter(line => line.trim() !== '')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const content = line.substring(6)
                    if (content === '[DONE]') continue
                    
                    // Extract the content from the stream
                    const data = JSON.parse(content)
                    const token = data.token || ''
                    
                    if (token) {
                      // Append the new token to the accumulated response
                      accumulatedResponse += token
                      
                      // Update the placeholder message with the accumulated response
                      setMessages((prev: Message[]) => 
                        prev.map(msg => 
                          msg.id === tempMessageId 
                            ? {...msg, content: accumulatedResponse} 
                            : msg
                        )
                      )
                    }
                  } catch (e) {
                    console.error('Error parsing streaming chunk:', e)
                  }
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        }
        
        // Stream is complete, save the message to IndexedDB
        if (accumulatedResponse) {
          // Extract reasoning if present
          let content = accumulatedResponse;
          let reasoning = '';
          
          // Check for reasoning in the response
          if (content.includes('<think>')) {
            const thinkMatches = content.match(/<think>([\s\S]*?)<\/think>/g);
            if (thinkMatches) {
              reasoning = thinkMatches
                .map(match => match.replace(/<\/?think>/g, ''))
                .join('\n---\n');
              content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            }
          }
          
          const finalMessage: Message = {
            role: "agent",
            content: content,
            timestamp: new Date().toLocaleTimeString(),
            modelId: currentModel,
            ...(reasoning && { reasoning })
          }
          
          // Replace the temporary message with the final one
          setMessages((prev: Message[]) => 
            prev.map(msg => 
              msg.id === tempMessageId 
                ? {...finalMessage} 
                : msg
            )
          )
          
          // Save to IndexedDB
          await dbService.addMessage(finalMessage)
        }
      } else {
        // Fallback to non-streaming response
        const data = await response.json()
        
        // Extract reasoning if present
        let content = data.message.content;
        let reasoning = '';
        
        if (content.includes('<think>')) {
          const thinkMatches = content.match(/<think>([\s\S]*?)<\/think>/g);
          if (thinkMatches) {
            reasoning = thinkMatches
              .map(match => match.replace(/<\/?think>/g, ''))
              .join('\n---\n');
            content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          }
        }
        
        const aiMessage: Message = {
          role: "agent",
          content: content,
          timestamp: new Date().toLocaleTimeString(),
          modelId: currentModel,
          ...(reasoning && { reasoning })
        }
        
        // Replace the placeholder with the complete message
        setMessages((prev: Message[]) => 
          prev.map(msg => 
            msg.id === tempMessageId 
              ? aiMessage 
              : msg
          )
        )
        
        // Save to IndexedDB
        await dbService.addMessage(aiMessage)
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      // Only show toast if we haven't already shown a more specific message
      if (!error.message || error.message === 'Failed to fetch') {
        toast.error('Network error: Unable to connect to the AI service')
        
        // Update the placeholder with a network error message
        const networkErrorContent = "⚠️ Network error: Unable to connect to the AI service. Please check your internet connection and try again."
        
        setMessages((prev: Message[]) => 
          prev.map(msg => 
            msg.id === tempMessageId 
              ? {...msg, content: networkErrorContent} 
              : msg
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, currentModel])
  
  // Handler for Enter key to send message
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    if (modelId === currentModel) return; // Don't switch if already on this model
    
    // Update model in service
    aiService.setModel(modelId);
    
    // Update current model state - this will trigger the useEffect to load model-specific messages
    setCurrentModel(modelId);
    
    // Display a success message when model is changed
    toast.success(`Switched to ${availableModels.find(m => m.id === modelId)?.name || modelId} model`);
  }, [currentModel])

  // Handle system prompt modal save
  const handleSystemPromptSave = useCallback(() => {
    setHasCustomPrompt(hasCustomSystemPrompt())
    setShowSystemPromptModal(false)
    toast.success('System prompt updated successfully')
  }, [])
  
  // Function to clear chat history for current model
  const clearChatHistory = useCallback(async () => {
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
  }, [currentModel])
  
  const handleRateMessage = useCallback(async (id: string, rating: number, feedback: string = "") => {
    setRatings(prev => ({ ...prev, [id]: { rating, feedback } }));
    setMessages(prevMsgs => prevMsgs.map(msg =>
      msg.id === id ? { ...msg, rating, feedback } : msg
    ));
    // Persist rating to IndexedDB
    if (id && typeof id === 'string' && id.startsWith('temp-id-') === false) {
      await dbService.updateMessageRating(id, rating, feedback);
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="p-4 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center w-full mb-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              AI Chat Assistant
            </h1>
          </div>
          <ModelSelector 
            onModelChange={handleModelChange}
            currentModel={currentModel}
          />
        </div>
        
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-primary/10 border-primary/20 text-sm font-medium">
            {availableModels.find(m => m.id === currentModel)?.name || currentModel}
          </Badge>
          
          {hasCustomPrompt && (
            <Badge variant="secondary" className="px-3 py-1 bg-green-100 border-green-200 text-green-800 text-sm font-medium">
              Custom System Prompt
            </Badge>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSystemPromptModal(true)}
                  className="flex items-center gap-1 px-3 py-1 h-auto hover:bg-muted rounded-full text-xs text-muted-foreground cursor-pointer"
                >
                  <Settings className="h-3 w-3 flex-shrink-0" />
                  <span>System Prompt</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Configure custom system prompt to override the default behavior.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground cursor-help">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  <span>{getSystemPromptDescription(currentModel)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>This model is optimized with a specific system prompt for better performance.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="mt-3 flex justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearChatHistory}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-1.5 border-red-200 dark:border-red-900/30"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear Chat History</span>
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-4 py-6" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {isClient && uniqueMessages.map((msg, i) => (
            <MessageCard
              key={msg.id || i}
              msg={msg}
              currentModel={currentModel}
              ratings={ratings}
              handleRateMessage={handleRateMessage}
            />
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm shadow-sm">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] max-h-40 border-gray-300 dark:border-gray-700 focus:border-primary dark:focus:border-primary resize-none shadow-sm transition-all"
            disabled={isLoading}
          />
          <Button 
            className="px-4 h-[60px] gap-2 flex-shrink-0 shadow-sm hover:shadow-md transition-all duration-200" 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
      
      {/* Custom System Prompt Modal */}
      <CustomSystemPrompt
        isOpen={showSystemPromptModal}
        onOpenChange={setShowSystemPromptModal}
        onSave={handleSystemPromptSave}
      />
    </div>
  )
}
