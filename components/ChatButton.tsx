import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatInterface } from './ChatInterface';

interface ChatButtonProps {
  isDarkMode?: boolean;
}

export function ChatButton({ isDarkMode = false }: ChatButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsChatOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-colors ${
          isDarkMode
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <ChatInterface
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isDarkMode={isDarkMode}
      />
    </>
  );
} 