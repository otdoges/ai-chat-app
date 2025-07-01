'use client'

import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Download, ThumbsUp, ThumbsDown, Loader2, Info, Code as CodeIcon, Send, Trash2, ArrowLeft, PlusCircle, MoreVertical, Bot, User } from 'lucide-react'
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

// Lazy load the syntax highlighter for better performance
const LazyPrism = lazy(() => import('react-syntax-highlighter').then(module => ({ default: module.Prism })))

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

// Optimized code block component
const CodeBlock = memo(({ language, code, index }: { language: string; code: string; index: number }) => {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  }, [code]);

  return (
    <div className="relative my-2 rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-xs font-medium text-gray-300">
        <span>{language || 'code'}</span>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0 hover:bg-gray-700"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <Suspense fallback={
        <div className="p-4 font-mono text-sm text-gray-200 whitespace-pre-wrap bg-gray-900">
          {code}
        </div>
      }>
        <div className="bg-gray-900">
          <LazyPrism
            language={language.toLowerCase()}
            customStyle={{ 
              margin: 0, 
              borderRadius: 0, 
              background: 'rgb(17 24 39)', 
              padding: '1rem',
              fontSize: '0.875rem',
              color: '#e5e7eb'
            }}
            codeTagProps={{
              style: {
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
              }
            }}
          >
            {code}
          </LazyPrism>
        </div>
      </Suspense>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

// Optimized message content formatter
const MessageContent = memo(({ content }: { content: string }) => {
  const processedContent = useMemo(() => {
    // Split content by code blocks
    const parts = content.split(/(```[\w\s]*\n[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```([\w\s]*)\n([\s\S]*?)```/);
        if (match) {
          const [_, language, code] = match;
          return <CodeBlock key={index} language={language.trim()} code={code} index={index} />;
        }
      }
      
      // Process inline code and regular text
      const segments = part.split(/(`[^`]+`)/g);
      return (
        <div key={index} className="text-sm leading-relaxed">
          {segments.map((segment, i) => {
            if (segment.startsWith('`') && segment.endsWith('`')) {
              return (
                <code key={i} className="px-1.5 py-0.5 mx-0.5 bg-gray-700 rounded text-sm font-mono text-blue-300">
                  {segment.slice(1, -1)}
                </code>
              );
            }
            // Process line breaks
            return segment.split('\n').map((line, j) => (
              j === 0 ? line : <div key={j}>{line}</div>
            ));
          })}
        </div>
      );
    });
  }, [content]);

  return <div className="space-y-2">{processedContent}</div>;
});

MessageContent.displayName = 'MessageContent';

// Memoized message component
const MessageBubble = memo(({ message, isUser }: { message: Message; isUser: boolean }) => {
  return (
    <div className={cn(
      "flex gap-3 mb-6 group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={cn(
        "rounded-2xl px-4 py-3 max-w-[85%] md:max-w-[75%]",
        isUser 
          ? "bg-blue-600 text-white ml-auto" 
          : "bg-gray-800 text-gray-100"
      )}>
        <MessageContent content={message.content} />
        <div className="text-xs opacity-70 mt-2">
          {message.timestamp}
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// Optimized chat sidebar
const ChatSidebar = memo(({ 
  chatSessions, 
  activeChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat,
  showMenu,
  setShowMenu 
}: {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  showMenu: string | null;
  setShowMenu: (id: string | null) => void;
}) => {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex-col hidden md:flex">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-white">Conversations</h2>
        <Button 
          onClick={onNewChat} 
          variant="ghost" 
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {chatSessions.map((session) => (
            <div key={session.id} className="group relative">
              <button
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors mb-1",
                  activeChatId === session.id 
                    ? "bg-gray-800 text-white" 
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                )}
                onClick={() => onSelectChat(session.id)}
              >
                <div className="truncate font-medium text-sm">{session.title}</div>
                <div className="text-xs text-gray-500 truncate">
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </button>
              
              <button
                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(session.id);
                }}
              >
                <MoreVertical className="h-4 w-4 text-gray-500 hover:text-white" />
              </button>
              
              {showMenu === session.id && (
                <div className="absolute right-0 top-10 z-20 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
                    onClick={() => onDeleteChat(session.id)}
                  >
                    <Trash2 className="h-3 w-3 inline mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
});

ChatSidebar.displayName = 'ChatSidebar';

// Helper function to create a new message
const createMessage = (role: "agent" | "user", content: string, modelId?: string): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: new Date().toLocaleTimeString(),
  modelId,
});

// Main optimized chat component
export default function ChatPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [currentModel, setCurrentModel] = useState(aiService.getCurrentModel());
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize chat sessions
  useEffect(() => {
    const initializeChats = async () => {
      try {
        const sessions = await dbService.getAllChats?.() || [];
        if (sessions.length > 0) {
          setChatSessions(sessions);
          setActiveChatId(sessions[0].id);
        } else {
          handleNewChat();
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        handleNewChat();
      }
    };
    
    initializeChats();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [chatSessions, activeChatId]);

  // Close menu on outside click
  useEffect(() => {
    const closeMenu = () => setShowMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  // Get active session and messages
  const activeSession = useMemo(() => 
    chatSessions.find((cs: ChatSession) => cs.id === activeChatId), 
    [chatSessions, activeChatId]
  );
  
  const messages = useMemo(() => 
    activeSession?.messages || [], 
    [activeSession]
  );

  // Create new chat handler
  const handleNewChat = useCallback(async () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `Chat ${chatSessions.length + 1}`,
      createdAt: new Date().toISOString(),
      messages: [createMessage("agent", "Hello! How can I help you today?")],
    };
    
    setChatSessions((prev: ChatSession[]) => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    setInput("");
    
    // Persist to IndexedDB
    try {
      await dbService.addChat?.(newSession);
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  }, [chatSessions.length]);

  // Select chat handler
  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  // Delete chat handler
  const handleDeleteChat = useCallback(async (id: string) => {
    setChatSessions((prev: ChatSession[]) => prev.filter((cs: ChatSession) => cs.id !== id));
    
    if (activeChatId === id) {
      const remaining = chatSessions.filter((cs: ChatSession) => cs.id !== id);
      setActiveChatId(remaining[0]?.id || null);
      if (remaining.length === 0) {
        handleNewChat();
      }
    }
    
    setShowMenu(null);
    
    try {
      await dbService.deleteChat?.(id);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [activeChatId, chatSessions, handleNewChat]);

  // Model change handler
  const handleModelChange = useCallback((modelId: string) => {
    if (modelId === currentModel) return;
    
    aiService.setModel(modelId);
    setCurrentModel(modelId);
    
    const modelName = availableModels.find(m => m.id === modelId)?.name || modelId;
    toast.success(`Switched to ${modelName}`);
  }, [currentModel]);

  // Optimized send message with streaming support
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeChatId || isLoading) return;
    
    const userMessage = createMessage("user", input, currentModel);
    setInput("");
    setIsLoading(true);
    
    // Optimistically update UI
    setChatSessions((prev: ChatSession[]) => prev.map((session: ChatSession) => 
      session.id === activeChatId 
        ? { ...session, messages: [...session.messages, userMessage] }
        : session
    ));
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          modelId: currentModel,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const aiMessage = createMessage("agent", "", currentModel);
      let accumulatedContent = "";

      // Add placeholder message for streaming
      setChatSessions((prev: ChatSession[]) => prev.map((session: ChatSession) => 
        session.id === activeChatId 
          ? { ...session, messages: [...session.messages, aiMessage] }
          : session
      ));

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter(line => line.trim());

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const content = line.substring(6);
                    if (content === '[DONE]') continue;

                    const data = JSON.parse(content);
                    const token = data.token || '';

                    if (token) {
                      accumulatedContent += token;
                      
                      // Update streaming message
                      setChatSessions((prev: ChatSession[]) => prev.map((session: ChatSession) => 
                        session.id === activeChatId 
                          ? {
                              ...session,
                              messages: session.messages.map(msg => 
                                msg.id === aiMessage.id 
                                  ? { ...msg, content: accumulatedContent }
                                  : msg
                              )
                            }
                          : session
                      ));
                    }
                  } catch (e) {
                    console.error('Error parsing stream chunk:', e);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else {
        // Fallback for non-streaming
        const data = await response.json();
        accumulatedContent = data.message.content;
        
        setChatSessions((prev: ChatSession[]) => prev.map((session: ChatSession) => 
          session.id === activeChatId 
            ? {
                ...session,
                messages: session.messages.map(msg => 
                  msg.id === aiMessage.id 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              }
            : session
        ));
      }

      // Persist updated session
      const updatedSession = chatSessions.find((cs: ChatSession) => cs.id === activeChatId);
      if (updatedSession) {
        await dbService.addChat?.(updatedSession);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove the user message on error
      setChatSessions((prev: ChatSession[]) => prev.map((session: ChatSession) => 
        session.id === activeChatId 
          ? { ...session, messages: session.messages.filter(msg => msg.id !== userMessage.id) }
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, activeChatId, isLoading, currentModel, messages, chatSessions]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="flex h-screen bg-gray-950">
      <ChatSidebar
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
      />
      
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-gray-900">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white">AI Chat</h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNewChat}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          
          <ModelSelector 
            onModelChange={handleModelChange} 
            currentModel={currentModel} 
          />
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="p-6 space-y-1">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.role === "user"}
              />
            ))}
            
            {isLoading && (
              <div className="flex gap-3 mb-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-gray-800 p-4 bg-gray-900">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[200px] resize-none bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim()}
              className="h-[60px] px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
