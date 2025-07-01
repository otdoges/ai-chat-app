'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Download, ThumbsUp, ThumbsDown, Loader2, Info, Code as CodeIcon, Send, Trash2, ArrowLeft, PlusCircle, MoreVertical } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import dbService from "@/lib/services/db"
import { ModelSelector } from "@/components/model-selector"
import aiService, { availableModels } from "@/lib/services/aiService"
import { getSystemPromptDescription } from "@/lib/systemPrompt"
import Link from "next/link"
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
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: string;
  modelId?: string;
  rating?: number;
  feedback?: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

// Memoized code formatter for better performance
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
          <div key={index} className="relative my-2 rounded-md overflow-hidden border border-border">
            <div className="flex items-center justify-between bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <span>{lang || 'code'}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-sm p-0 hover:bg-muted-foreground/10"
                      onClick={() => {
                        navigator.clipboard.writeText(code);
                        toast.success('Code copied to clipboard');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="sr-only">Copy code</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy code</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <SyntaxHighlighter
              language={lang}
              style={oneDark}
              customStyle={{ margin: 0, borderRadius: 0 }}
              showLineNumbers={true}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }
    }
    
    // Handle normal text with improved markdown-like formatting
    return (
      <div key={index} className="prose prose-neutral dark:prose-invert max-w-none">
        {part.split('\n').map((line, i) => {
          // Bold text
          line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          // Italic text
          line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
          // Links
          line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
          
          return <p key={i} dangerouslySetInnerHTML={{ __html: line }} />;
        })}
      </div>
    );
  });
});
FormatMessageContent.displayName = "FormatMessageContent";

// Memoized message component for performance
const MessageItem = React.memo(({ message, currentModel, onRateMessage, onSubmitFeedback, ratings }: {
  message: Message;
  currentModel: string;
  onRateMessage: (messageId: string, rating: number) => void;
  onSubmitFeedback: (messageId: string, feedback: string) => void;
  ratings: { [id: string]: { rating: number, feedback: string } };
}) => {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    toast.success("Message copied to clipboard");
  }, [message.content]);

  const handleGithubReport = useCallback(() => {
    window.open(
      `https://github.com/username/ai-chat-app/issues/new?title=Issue+with+${currentModel}+response&body=${encodeURIComponent(
        `## Model\n${currentModel}\n\n## Response\n${message.content}\n\n## Description\nPlease describe the issue:\n\n`
      )}`,
      '_blank'
    );
    toast.success('Opening GitHub issue form');
  }, [currentModel, message.content]);

  return message.role === "user" ? (
    <div className="flex items-start mb-6">
      <div className="flex-shrink-0 mr-4">
        <div className="w-[80px] h-[80px] bg-[#6D5DFC] rounded-full flex items-center justify-center">
          <div className="w-[60px] h-[60px] bg-[#141414] rounded-full" />
        </div>
      </div>
      <div className="bg-[#141414] rounded-xl py-4 px-5 max-w-3xl">
        <div className="text-[#9e9e9e]">
          <FormatMessageContent content={message.content} />
        </div>
      </div>
    </div>
  ) : (
    <div className="mb-6 ml-20 mr-4">
      <div className="bg-[#6D5DFC] rounded-xl py-4 px-5 max-w-3xl">
        <div className="text-white">
          <FormatMessageContent content={message.content} />
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = "MessageItem";

// Memoized chat session item for sidebar
const ChatSessionItem = React.memo(({ 
  session, 
  isActive, 
  onSelect, 
  onShowMenu, 
  showMenu 
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onShowMenu: (id: string) => void;
  showMenu: string | null;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(session.id);
  }, [onSelect, session.id]);

  const handleShowMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShowMenu(session.id);
  }, [onShowMenu, session.id]);

  return (
    <div className="group flex items-center justify-between hover:bg-muted transition px-4 py-3">
      <button
        className={`flex-1 text-left truncate ${isActive ? 'font-semibold' : ''}`}
        onClick={handleSelect}
      >
        <div className="truncate">{session.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {new Date(session.createdAt).toLocaleString()}
        </div>
      </button>
      <div className="relative flex items-center ml-2">
        <button
          className="opacity-0 group-hover:opacity-100 transition"
          onClick={handleShowMenu}
          aria-label="Chat options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
ChatSessionItem.displayName = "ChatSessionItem";

// Helper function to create a new message with id - memoized
const createMessage = (role: "agent" | "user", content: string, modelId?: string): Message => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  role,
  content,
  timestamp: new Date().toLocaleTimeString(),
  modelId,
});

// Enhanced ChatInterface with MCP capabilities
export default function ChatPage() {
  // Chat session state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [currentModel, setCurrentModel] = useState(aiService.getCurrentModel());
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [ratings, setRatings] = useState<{ [id: string]: { rating: number, feedback: string } }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  // Memoized active session and messages for performance
  const activeSession = useMemo(() => 
    chatSessions.find(cs => cs.id === activeChatId), [chatSessions, activeChatId]
  );
  
  const messages = useMemo(() => 
    activeSession?.messages || [], [activeSession]
  );

  // Memoized unique messages to prevent duplicates
  const uniqueMessages = useMemo(() => 
    [...new Map(messages.map(msg => [msg.id, msg])).values()], [messages]
  );

  // Load chat history from dbService (IndexedDB) on mount
  useEffect(() => {
    setIsClient(true);
    const loadChats = async () => {
      try {
        const sessions = await dbService.getAllChats?.(); // Assume dbService supports this
        if (sessions && sessions.length > 0) {
          setChatSessions(sessions);
          setActiveChatId(sessions[0].id);
        } else {
          // Create a new chat if none exists
          handleNewChat();
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        handleNewChat();
      }
    };
    loadChats();
  }, []);

  // Memoized handlers for better performance
  const handleNewChat = useCallback(async () => {
    const newSession: ChatSession = {
      id: `${Date.now()}`,
      title: `Chat ${chatSessions.length + 1}`,
      createdAt: new Date().toISOString(),
      messages: [createMessage("agent", "Welcome! Start your conversation.")],
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    setInput("");
    textareaRef.current?.focus();
    // Optionally persist to dbService
    try {
      await dbService.addChat?.(newSession);
    } catch (error) {
      console.error('Error saving new chat:', error);
    }
  }, [chatSessions.length]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const handleDeleteChat = useCallback((id: string) => {
    setChatSessions(prev => prev.filter(cs => cs.id !== id));
    if (activeChatId === id) {
      // Switch to another chat if deleting the active one
      const next = chatSessions.find(cs => cs.id !== id);
      setActiveChatId(next?.id || null);
    }
    setShowMenu(null);
    try {
      dbService.deleteChat?.(id);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [activeChatId, chatSessions]);

  const handleShowMenu = useCallback((id: string) => {
    setShowMenu(prev => prev === id ? null : id);
  }, []);

  // Function to send a message to the AI model with MCP enhancements
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeChatId) return;
    
    const userMessage = createMessage("user", input, currentModel);
    const currentSession = chatSessions.find(cs => cs.id === activeChatId);
    const messagesForApi = currentSession ? [...currentSession.messages, userMessage] : [userMessage];
    
    setInput("");
    textareaRef.current?.focus();
    setIsLoading(true);
    
    try {
      // POST to backend with correct URL: /api/chat not /api/chat/route.ts
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          modelId: currentModel,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to send message to backend");
      
      const data = await response.json();
      const aiMessage = createMessage("agent", data.message.content, currentModel);
      
      setChatSessions((prev: ChatSession[]) => {
        const updatedSessions = [...prev];
        const activeSessionIndex = updatedSessions.findIndex(cs => cs.id === activeChatId);
        if (activeSessionIndex !== -1) {
          // Only add if not already present
          const ids = new Set(updatedSessions[activeSessionIndex].messages.map(m => m.id));
          if (!ids.has(userMessage.id)) {
            updatedSessions[activeSessionIndex].messages.push(userMessage);
          }
          if (!ids.has(aiMessage.id)) {
            updatedSessions[activeSessionIndex].messages.push(aiMessage);
          }
        }
        return updatedSessions;
      });
      
      // Persist updated session
      const updatedSession = chatSessions.find(cs => cs.id === activeChatId);
      if (updatedSession) await dbService.addChat(updatedSession);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [input, activeChatId, currentModel, chatSessions]);

  // Handler for Enter key to send message
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    if (modelId === currentModel) return; // Don't switch if already on this model
    
    // Update model in service
    aiService.setModel(modelId);
    
    // Update current model state - this will trigger the useEffect to load model-specific messages
    setCurrentModel(modelId);
    
    // Display a success message when model is changed
    toast.success(`Switched to ${availableModels.find(m => m.id === modelId)?.name || modelId} model`);
  }, [currentModel]);
  
  // Function to clear chat history for current model
  const clearChatHistory = useCallback(async () => {
    if (!activeChatId) return;
    
    try {
      // Clear from database
      await dbService.clearMessagesByModel(activeChatId);
      
      // Create new welcome message
      const welcomeMessage = createMessage("agent", `Chat history cleared. I am using the ${availableModels.find(m => m.id === currentModel)?.name || currentModel} model. How may I assist you today?`, currentModel);
      
      // Reset messages to just the welcome message
      setChatSessions((prev: ChatSession[]) => {
        const updatedSessions = [...prev];
        const activeSessionIndex = updatedSessions.findIndex(cs => cs.id === activeChatId);
        if (activeSessionIndex !== -1) {
          updatedSessions[activeSessionIndex].messages = [welcomeMessage];
        }
        return updatedSessions;
      });
      
      toast.success("Chat history cleared");
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast.error('Failed to clear chat history');
    }
  }, [activeChatId, currentModel]);
  
  // Function to handle message rating
  const handleRateMessage = useCallback(async (messageId: string, rating: number) => {
    try {
      // Store rating in state
      setRatings(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], rating }
      }));
      
      // Update in database
      await dbService.updateMessageRating(messageId, rating);
      
      // Show success message
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error rating message:', error);
      toast.error('Failed to save rating');
    }
  }, []);
  
  // Function to handle feedback submission
  const handleSubmitFeedback = useCallback(async (messageId: string, feedback: string) => {
    try {
      // Store feedback in state
      setRatings(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], feedback }
      }));
      
      // Update in database (reusing the rating if it exists)
      const rating = ratings[messageId]?.rating || 0;
      await dbService.updateMessageRating(messageId, rating, feedback);
      
      // Show success message
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback');
    }
  }, [ratings]);

  // Close menu on outside click
  useEffect(() => {
    const closeMenu = () => setShowMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div className="flex h-screen bg-[#111111]">
      {/* Sidebar for chat history */}
      <aside className="w-64 bg-[#141414] border-r border-[#1A1A1A] flex-col hidden md:flex">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-bold text-lg">Chat History</div>
          <Button onClick={handleNewChat} variant="ghost" size="icon" title="New Chat">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatSessions.map((session) => (
            <div key={session.id}>
              <ChatSessionItem
                session={session}
                isActive={activeChatId === session.id}
                onSelect={handleSelectChat}
                onShowMenu={handleShowMenu}
                showMenu={showMenu}
              />
              {showMenu === session.id && (
                <div className="absolute right-0 mt-2 z-20 w-32 bg-popover border rounded shadow-lg">
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted text-red-600"
                    onClick={() => handleDeleteChat(session.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />Delete Chat
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted text-red-500"
                    onClick={clearChatHistory}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />Clear Messages
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
      
      {/* Main chat area */}
      <div className="flex flex-1 flex-col bg-[#111111]">
        {/* Top bar with Model selector */}
        <header className="flex items-center justify-between border-b border-[#1A1A1A] px-6 py-4 bg-[#141414]">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModelSelector onModelChange={handleModelChange} currentModel={currentModel} />
          </div>
        </header>
        
        {/* Main chat area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="flex flex-col p-6 pb-20">
              {uniqueMessages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  currentModel={currentModel}
                  onRateMessage={handleRateMessage}
                  onSubmitFeedback={handleSubmitFeedback}
                  ratings={ratings}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Input area */}
        <div className="p-4 mt-auto">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Type your message here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] resize-none bg-[#141414] border-0 text-white rounded-lg px-6 py-4 placeholder:text-[#6D6D6D] focus:ring-2 focus:ring-[#6D5DFC] transition-all"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !input.trim()}
                className="absolute right-3 bottom-3 h-8 w-8 p-0 bg-[#6D5DFC] hover:bg-[#5A4FD8] text-white rounded-full transition-all duration-200 hover:scale-105"
              >
                {isLoading ? 
                  <Loader2 className="h-5 w-5 animate-spin" /> : 
                  <Send className="h-5 w-5" />
                }
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
