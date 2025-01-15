import { useState, useRef, useEffect } from 'react';
import { X, Send, GripHorizontal, Trash2, Mic, MicOff, Loader2, Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

// Load chat history from localStorage
const loadChatHistory = (): ChatMessage[] => {
  try {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      return JSON.parse(saved).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
  return [];
};

// Save chat history to localStorage
const saveChatHistory = (messages: ChatMessage[]) => {
  try {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  } catch (err) {
    console.error('Failed to save chat history:', err);
  }
};

export function ChatInterface({ isOpen, onClose, isDarkMode = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 100 });
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });

  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  // Set initial position after mount
  useEffect(() => {
    setDragPosition({ x: window.innerWidth / 2 - 300, y: 100 });
  }, []);

  // Handle window resize events
  useEffect(() => {
    const handleResize = () => {
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

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      // Append new transcribed text to existing input
      const newText = data.text.trim();
      setTranscribedText(newText);
      setInputMessage(prev => {
        const separator = prev.trim() ? ' ' : '';
        return prev.trim() + separator + newText;
      });
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Modified submit handler to clear transcribed text
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    if (!inputMessage.trim()) return;

    setTranscribedText(null); // Clear transcribed text after sending
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    try {
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(({ role, content }) => ({ role, content }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date()
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  // Save messages to localStorage whenever they change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Add clear history functionality with confirmation
  const clearHistory = () => {
    if (messages.length === 0) return;
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
    setShowClearConfirm(false);
  };

  // Add copy functionality
  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`fixed z-[9999] rounded-xl shadow-2xl overflow-hidden ${
        isDarkMode 
          ? 'bg-black text-white border border-gray-800' 
          : 'bg-white text-gray-900 border border-gray-200'
      }`}
      style={{
        left: dragPosition.x,
        top: dragPosition.y,
        width: size.width,
        height: size.height
      }}
    >
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center backdrop-blur-sm">
          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'} shadow-2xl max-w-sm mx-4 border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h3 className="text-lg font-semibold mb-4">Clear Chat History?</h3>
            <p className="mb-6 text-sm opacity-80">This will permanently delete all chat messages. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Made sticky */}
      <div 
        ref={dragRef}
        className={`sticky top-0 z-[10000] p-4 cursor-move flex items-center justify-between border-b shadow-sm ${
          isDarkMode 
            ? 'bg-gray-900 border-gray-800' 
            : 'bg-gray-50 border-gray-200'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3">
          <GripHorizontal className="w-5 h-5 opacity-70" />
          <span className="font-semibold text-lg text-black dark:text-white">AI Assistant</span>
          <span className="text-xs opacity-50">(Drag to move)</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearHistory}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              messages.length > 0
                ? isDarkMode
                  ? 'hover:bg-gray-800 text-red-400 hover:text-red-300'
                  : 'hover:bg-gray-100 text-red-500 hover:text-red-600'
                : 'opacity-50 cursor-not-allowed'
            }`}
            title="Clear chat history"
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Clear Chat</span>
          </button>
          <button
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-800 text-red-400' : 'hover:bg-gray-100 text-red-500'
            }`}
            title="Close window"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Close</span>
          </button>
        </div>
      </div>

      {/* Messages - Adjusted for sticky header */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4" 
        style={{ 
          height: 'calc(100% - 180px)',
          marginTop: 0 // Ensure no gap after sticky header
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`group flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`relative flex flex-col max-w-[85%] p-4 rounded-xl ${
                message.role === 'user'
                  ? isDarkMode
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-900 text-white'
                  : isDarkMode
                  ? 'bg-gray-900 border border-gray-800'
                  : 'bg-gray-100'
              }`}
            >
              <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''} prose-p:my-0 prose-ul:my-0 prose-ul:pl-4`}>
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1 last:mb-0" {...props} />
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              <div className="flex items-center justify-between gap-4 mt-2">
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
                <button
                  onClick={() => copyToClipboard(message.content, index)}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                  title="Copy message"
                >
                  {copiedMessageId === index ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <div className={`inline-block p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
            }`}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 mb-4 p-3 rounded-lg border border-red-200 bg-red-50">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type 'search:' followed by your query to search the web (e.g. 'search: what is the weather?'). Press Enter to send, Shift + Enter for new line"
              className={`w-full p-3 rounded-lg border resize-none ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-gray-500`}
              style={{ minHeight: '80px' }}
              disabled={isLoading}
            />
            {transcribedText && (
              <div className={`absolute bottom-full mb-2 left-0 right-0 p-4 rounded-lg text-sm ${
                isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="font-medium mb-2">Transcribed Text:</div>
                <div className="opacity-80">{transcribedText}</div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing}
              className={`p-3 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700'
                  : 'bg-gray-100 hover:bg-gray-200'
              } disabled:opacity-50 flex items-center gap-2`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transcribing...</span>
                </>
              ) : isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Record Voice</span>
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className={`p-3 rounded-lg transition-colors flex items-center gap-2 ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-gray-100'
                  : 'bg-black text-white hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </div>
        </form>
      </div>

      {/* Resize handles */}
      <div
        className={`absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center ${
          isDarkMode ? 'text-gray-600' : 'text-gray-400'
        }`}
        onMouseDown={handleResizeStart}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            fill="currentColor"
            d="M0 10L10 10L10 0Z"
          />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-1 h-full cursor-ew-resize hover:bg-gray-400/20" />
      <div className="absolute bottom-0 right-0 w-full h-1 cursor-ns-resize hover:bg-gray-400/20" />
    </div>,
    document.body
  );
} 