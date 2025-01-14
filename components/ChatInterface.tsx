import { useState, useRef, useEffect } from 'react';
import { X, Send, GripHorizontal, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getSnagContext, searchSnags } from '@/lib/db';

// OpenAI types
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export function ChatInterface({ isOpen, onClose, isDarkMode = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `You are a helpful assistant that can answer questions about snag entries in the database. You can provide information about snags, their descriptions, annotations, and help users find specific entries. Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} and the current time is ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Please use this information when discussing dates or times with users.`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 100 });
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // Set initial position after mount
  useEffect(() => {
    setDragPosition({ x: window.innerWidth / 2 - 300, y: 100 });
  }, []);

  // Handle window resize events
  useEffect(() => {
    const handleResize = () => {
      // Keep window within viewport bounds
      setDragPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - size.width),
        y: Math.min(prev.y, window.innerHeight - size.height)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  // Handle resize logic
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
      const newHeight = Math.max(300, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
      
      setSize({
        width: Math.min(newWidth, window.innerWidth - dragPosition.x),
        height: Math.min(newHeight, window.innerHeight - dragPosition.y)
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, dragPosition]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - dragPosition.x,
        y: e.clientY - dragPosition.y
      };
      
      const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingRef.current) {
          const newX = Math.max(0, Math.min(e.clientX - dragStartRef.current.x, window.innerWidth - size.width));
          const newY = Math.max(0, Math.min(e.clientY - dragStartRef.current.y, window.innerHeight - size.height));
          
          setDragPosition({
            x: newX,
            y: newY
          });
        }
      };
      
      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY
    };
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    try {
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsLoading(true);
      setError(null);

      // Get database context on client side
      console.log('🔍 Getting context for:', userMessage.content);
      let context;
      try {
        context = await getSnagContext(userMessage.content);
        console.log('📊 Retrieved context:', context);
      } catch (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to access database. Please refresh the page and try again.');
      }

      let additionalContext = '';
      if (context.project) {
        additionalContext = `
          Project "${context.project.name}" has ${context.project.totalSnags} snags.
          Status breakdown: ${JSON.stringify(context.project.statusCounts)}
          Locations: ${context.project.locations.join(', ')}
        `;
      } else if (context.snag) {
        additionalContext = `
          Found snag #${context.snag.snagNumber}:
          Name: ${context.snag.name}
          Description: ${context.snag.description}
          Location: ${context.snag.location}
          Status: ${context.snag.status}
          Priority: ${context.snag.priority}
          Assigned to: ${context.snag.assignedTo}
          
          Related snags in same location/status: ${context.relatedSnags.map(s => '#' + s.snagNumber).join(', ')}
        `;
      } else if (context.availableProjects?.length > 0) {
        additionalContext = `Available projects: ${context.availableProjects.join(', ')}`;
      }

      // If no specific project/snag found, try general search
      if (!additionalContext && userMessage.content.length > 0) {
        try {
          const searchResults = await searchSnags(userMessage.content);
          if (searchResults.length > 0) {
            additionalContext = `
              Found ${searchResults.length} matching snags:
              ${searchResults.slice(0, 5).map(s => 
                `#${s.snagNumber} (${s.projectName}): ${s.name} - ${s.status}`
              ).join('\n')}
              ${searchResults.length > 5 ? `\n...and ${searchResults.length - 5} more` : ''}
            `;
          }
        } catch (searchError) {
          console.error('Search error:', searchError);
        }
      }

      // Update system message with context
      const updatedMessages = [...messages, userMessage].map(m => {
        if (m.role === 'system' && additionalContext) {
          return {
            ...m,
            content: `${m.content.split('\n\nContext for current query:')[0]}\n\nContext for current query:\n${additionalContext}`
          };
        }
        return m;
      });

      console.log('📤 Making API request...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages
        }),
      });

      console.log('📥 Received response:', response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      if (data.message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message.content,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('❌ Chat error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const chat = (
    <div 
      className={`fixed z-[9999] rounded-lg shadow-lg ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}
      style={{
        top: `${dragPosition.y}px`,
        left: `${dragPosition.x}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform: 'none'
      }}
    >
      {/* Header */}
      <div 
        ref={dragRef}
        className={`p-3 rounded-t-lg flex justify-between items-center cursor-grab active:cursor-grabbing ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}
        onMouseDown={handleMouseDown}
      >
        <span className="font-medium">AI Assistant</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              // Keep the initial system message but clear the rest
              setMessages([messages[0]]);
              setError(null);
            }}
            className={`p-1 rounded-full hover:bg-opacity-80 ${
              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
            }`}
            title="Clear chat history"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className={`p-1 rounded-full hover:bg-opacity-80 ${
              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
            }`}
            title="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(100% - 120px)' }}>
        <div className="space-y-4">
          {messages.filter(m => m.role !== 'system').map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <div className="text-red-500 text-sm">
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSubmit}
        className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className={`flex-1 p-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className={`p-2 rounded-lg ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-gray-400 rounded-sm" />
      </div>
    </div>
  );

  return createPortal(chat, document.body);
} 