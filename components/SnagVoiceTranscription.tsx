import { useState, useRef } from 'react';
import { Mic, MicOff, Plus, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SnagVoiceTranscriptionProps {
  snagId: string;
  currentDescription: string;
  currentName: string;
  onSnagUpdate: (updates: { description: string; name?: string }) => void;
  isDarkMode?: boolean;
  onClose: () => void;
}

export function SnagVoiceTranscription({
  snagId,
  currentDescription,
  currentName,
  onSnagUpdate,
  isDarkMode = false,
  onClose
}: SnagVoiceTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // Ensure the modal stays within viewport bounds
      const maxX = window.innerWidth - 400; // 400 is modal width
      const maxY = window.innerHeight - 400; // approximate modal height
      
      setPosition({
        x: Math.min(Math.max(0, newX), maxX),
        y: Math.min(Math.max(0, newY), maxY)
      });
    };
    
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');
      
      const { text } = await response.json();
      setTranscribedText(text);
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateNameIfNeeded = async (description: string) => {
    const wordCount = currentName.split(/\s+/).length;
    if (currentName === 'Untitled Entry' || wordCount > 3) {
      try {
        const response = await fetch('/api/generate-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ description }),
        });

        if (!response.ok) throw new Error('Failed to generate name');
        
        const { name } = await response.json();
        return name;
      } catch (error) {
        console.error('Name generation error:', error);
        toast.error('Failed to generate name, keeping existing name');
        return currentName;
      }
    }
    return currentName;
  };

  const handleAddText = async () => {
    const newDescription = currentDescription + '\n' + transcribedText;
    const newName = await generateNameIfNeeded(newDescription);
    
    onSnagUpdate({
      description: newDescription,
      ...(newName !== currentName && { name: newName })
    });
    onClose();
  };

  const handleReplaceText = async () => {
    const newName = await generateNameIfNeeded(transcribedText);
    
    onSnagUpdate({
      description: transcribedText,
      ...(newName !== currentName && { name: newName })
    });
    onClose();
  };

  return (
    <div 
      className={cn(
        'fixed z-[9999] w-[400px] rounded-lg shadow-lg pointer-events-auto',
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div 
        ref={dragRef}
        className={cn(
          'p-3 rounded-t-lg flex justify-between items-center cursor-grab active:cursor-grabbing',
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        )}
        onMouseDown={handleMouseDown}
      >
        <span className="font-medium">Voice to Description</span>
        <button
          onClick={onClose}
          className={cn(
            'p-1 rounded-full hover:bg-opacity-80',
            isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
          )}
        >
          ×
        </button>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <label className={cn(
            'block text-sm font-medium mb-2',
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          )}>
            Current Description
          </label>
          <div className={cn(
            'p-2 rounded-md text-sm mb-4 max-h-[100px] overflow-y-auto',
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          )}>
            {currentDescription || 'No description'}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className={cn(
              'block text-sm font-medium',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              Voice Input
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                'h-8 w-8 p-0',
                isRecording && 'text-red-500'
              )}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className={cn(
            'p-2 rounded-md text-sm min-h-[60px] max-h-[150px] overflow-y-auto',
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          )}>
            {isTranscribing ? (
              <div className="flex items-center justify-center py-2 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Transcribing...
              </div>
            ) : (
              transcribedText || 'Transcribed text will appear here'
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddText}
            disabled={!transcribedText || isTranscribing}
          >
            <Plus className="h-4 w-4 mr-1" /> Add to Description
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleReplaceText}
            disabled={!transcribedText || isTranscribing}
          >
            Replace Description
          </Button>
        </div>
      </div>
    </div>
  );
} 