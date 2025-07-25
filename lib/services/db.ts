import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: string;
  modelId?: string; // Track which model this message belongs to
  rating?: number; // Add rating property
  feedback?: string; // Add feedback property
  reasoning?: string; // Reasoning content for models that support it
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

interface ChatDB extends DBSchema {
  messages: {
    key: string;
    value: ChatMessage;
    indexes: { 
      'by-timestamp': string,
      'by-model': string // Index to query messages by model
    };
  };
  chats: {
    key: string;
    value: ChatSession;
    indexes: {
      'createdAt': string
    }
  };
}

interface IndexedDBService {
  dbName: string;
  dbVersion: number;
  db: Promise<IDBPDatabase<ChatDB>> | null;
  addMessage: (message: Omit<ChatMessage, 'id'>) => Promise<string>;
  getMessages: () => Promise<ChatMessage[]>;
  getMessagesByModel: (modelId: string) => Promise<ChatMessage[]>;
  clearAllMessages: () => Promise<void>;
  clearMessagesByModel: (modelId: string) => Promise<void>;
  updateMessageRating: (id: string, rating: number, feedback: string) => Promise<void>;
  getAllChats: () => Promise<ChatSession[]>;
  addChat: (session: ChatSession) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  exportChatHistory: () => Promise<string>;
  importChatHistory: (data: string) => Promise<void>;
}

class IndexedDBServiceImpl implements IndexedDBService {
  dbName = 'chat-interface-db';
  dbVersion = 2; // Bumped from 1 to 2
  db: Promise<IDBPDatabase<ChatDB>> | null = null;

  constructor() {
    // Only initialize IndexedDB in browser environments
    if (isBrowser) {
      this.db = this.initDB();
    }
  }

  async initDB(): Promise<IDBPDatabase<ChatDB>> {
    if (!isBrowser) {
      throw new Error('IndexedDB is only available in browser environments');
    }
    
    return openDB<ChatDB>(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create messages store if not present
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('by-timestamp', 'timestamp');
        }
        // Add by-model index if not present
        const messagesStore = transaction.objectStore('messages');
        if (!messagesStore.indexNames.contains('by-model')) {
          try {
            messagesStore.createIndex('by-model', 'modelId');
          } catch (error) {
            console.error('Error adding by-model index during upgrade:', error);
          }
        }
        // Create chats store if not present
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }

  async addMessage(message: Omit<ChatMessage, 'id'>): Promise<string> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, message not saved');
      return 'temp-id-' + new Date().getTime();
    }
    
    const id = crypto.randomUUID();
    const messageWithId = { ...message, id };
    
    const db = await this.db;
    if (db) {
      await db.add('messages', messageWithId);
    } else {
      console.warn('DB is null, message not saved');
    }
    
    return id;
  }

  // Get all messages regardless of model
  async getMessages(): Promise<ChatMessage[]> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, returning empty messages array');
      return [];
    }
    
    const db = await this.db;
    if (!db) {
      console.warn('DB is null, returning empty messages array');
      return [];
    }
    
    return db.getAllFromIndex('messages', 'by-timestamp');
  }
  
  // Get messages for a specific model
  async getMessagesByModel(modelId: string): Promise<ChatMessage[]> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, returning empty messages array');
      return [];
    }
    
    if (!modelId) {
      console.warn('No modelId provided, returning empty messages array');
      return [];
    }
    
    try {
      const db = await this.db;
      if (!db) {
        console.warn('DB is null, returning empty messages array');
        return [];
      }
      
      // Use the by-model index to filter messages
      const messages = await db.getAllFromIndex('messages', 'by-model', modelId);
      console.log(`Retrieved ${messages.length} messages for model ${modelId}`);
      return messages;
    } catch (error) {
      console.error('Error getting messages by model:', error);
      return [];
    }
  }

  // Clear all messages regardless of model
  async clearAllMessages(): Promise<void> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, cannot clear messages');
      return;
    }
    
    const db = await this.db;
    if (!db) {
      console.warn('DB is null, cannot clear messages');
      return;
    }
    
    await db.clear('messages');
  }
  
  // Clear messages for a specific model
  async clearMessagesByModel(modelId: string): Promise<void> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, cannot clear messages');
      return;
    }
    
    if (!modelId) {
      console.warn('No modelId provided, no messages cleared');
      return;
    }
    
    try {
      const db = await this.db;
      if (!db) {
        console.warn('DB is null, cannot clear messages');
        return;
      }
      
      // Get messages for this model
      const messages = await db.getAllFromIndex('messages', 'by-model', modelId);
      
      // Delete each message
      const transaction = db.transaction('messages', 'readwrite');
      const store = transaction.objectStore('messages');
      
      for (const message of messages) {
        await store.delete(message.id);
      }
      
      await transaction.done;
      console.log(`Cleared ${messages.length} messages for model ${modelId}`);
    } catch (error) {
      console.error('Error clearing messages by model:', error);
    }
  }

  // Add or update a message rating and feedback
  async updateMessageRating(id: string, rating: number, feedback: string = ""): Promise<void> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, cannot update rating');
      return;
    }
    try {
      const db = await this.db;
      if (!db) {
        console.warn('DB is null, cannot update rating');
        return;
      }
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const msg = await store.get(id);
      if (msg) {
        msg.rating = rating;
        msg.feedback = feedback;
        await store.put(msg);
      }
      await tx.done;
    } catch (error) {
      console.error('Error updating message rating:', error);
    }
  }

  async getAllChats(): Promise<ChatSession[]> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, returning empty chats array');
      return [];
    }
    
    const db = await this.db;
    if (!db) {
      console.warn('DB is null, returning empty chats array');
      return [];
    }
    
    return db.getAllFromIndex('chats', 'createdAt');
  }

  async addChat(session: ChatSession): Promise<void> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, chat not saved');
      return;
    }
    const db = await this.db;
    if (db) {
      await db.put('chats', session); // Use put for upsert
    } else {
      console.warn('DB is null, chat not saved');
    }
  }

  async deleteChat(id: string): Promise<void> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, cannot delete chat');
      return;
    }
    
    const db = await this.db;
    if (db) {
      await db.delete('chats', id);
    } else {
      console.warn('DB is null, cannot delete chat');
    }
  }

  async exportChatHistory(): Promise<string> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, cannot export chat history');
      return JSON.stringify({ messages: [], chats: [], exportDate: new Date().toISOString() });
    }
    
    try {
      const db = await this.db;
      if (!db) {
        console.warn('DB is null, cannot export chat history');
        return JSON.stringify({ messages: [], chats: [], exportDate: new Date().toISOString() });
      }
      
      // Get all messages and chats
      const messages = await db.getAll('messages');
      const chats = await db.getAll('chats');
      
      // Create export data structure
      const exportData = {
        messages: messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        chats: chats.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting chat history:', error);
      throw new Error('Failed to export chat history');
    }
  }

  async importChatHistory(data: string): Promise<void> {
    if (!isBrowser || !this.db) {
      console.warn('IndexedDB not available, cannot import chat history');
      return;
    }
    
    try {
      const importData = JSON.parse(data);
      
      // Validate import data structure
      if (!importData || typeof importData !== 'object') {
        throw new Error('Invalid import data format');
      }
      
      if (!Array.isArray(importData.messages)) {
        throw new Error('Invalid messages data in import');
      }
      
      const db = await this.db;
      if (!db) {
        console.warn('DB is null, cannot import chat history');
        return;
      }
      
      // Start transaction for atomic operation
      const tx = db.transaction(['messages', 'chats'], 'readwrite');
      const messagesStore = tx.objectStore('messages');
      const chatsStore = tx.objectStore('chats');
      
      // Import messages
      for (const message of importData.messages) {
        // Validate message structure
        if (!message.id || !message.role || !message.content || !message.timestamp) {
          console.warn('Skipping invalid message:', message);
          continue;
        }
        
        // Generate new ID if message already exists
        const existingMessage = await messagesStore.get(message.id);
        if (existingMessage) {
          message.id = crypto.randomUUID();
        }
        
        await messagesStore.put(message);
      }
      
      // Import chats if they exist
      if (Array.isArray(importData.chats)) {
        for (const chat of importData.chats) {
          if (!chat.id || !chat.title || !chat.createdAt) {
            console.warn('Skipping invalid chat:', chat);
            continue;
          }
          
          // Generate new ID if chat already exists
          const existingChat = await chatsStore.get(chat.id);
          if (existingChat) {
            chat.id = crypto.randomUUID();
          }
          
          await chatsStore.put(chat);
        }
      }
      
      await tx.done;
      console.log(`Successfully imported ${importData.messages.length} messages and ${importData.chats?.length || 0} chats`);
    } catch (error) {
      console.error('Error importing chat history:', error);
      throw new Error('Failed to import chat history: ' + (error as Error).message);
    }
  }
}

// Export a singleton instance
const dbService = new IndexedDBServiceImpl();
export default dbService;
