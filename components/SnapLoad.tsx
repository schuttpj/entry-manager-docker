import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { ScreenCapture } from './ScreenCapture';
import ImageAnnotator from './ImageAnnotator';
import { QuickSnagVoiceTranscription } from './QuickSnagVoiceTranscription';
import { addSnag, updateSnag } from '@/lib/db';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Maximize, Mic, MicOff, Sparkles } from 'lucide-react';
import { Input } from './ui/input';

interface SnapLoadProps {
  projectName: string;
  onComplete: () => void;
  isDarkMode?: boolean;
}

export function SnapLoad({ projectName, onComplete, isDarkMode = false }: SnapLoadProps) {
  console.log('[SnapLoad] Component initialized with project:', projectName);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [snagId, setSnagId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [name, setName] = useState(`Screen Capture ${new Date().toLocaleString()}`);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const createdSnagRef = useRef<any>(null);

  // Debug state changes
  useEffect(() => {
    console.log('[SnapLoad] State Update:', {
      isCapturing,
      isAnnotating,
      isRecording,
      snagId,
      hasImage: !!capturedImage,
      annotationsCount: annotations.length,
      descriptionLength: description.length,
      createdSnag: createdSnagRef.current
    });
  }, [isCapturing, isAnnotating, isRecording, snagId, capturedImage, annotations, description]);

  const handleCapture = async (imageData: string) => {
    console.log('[SnapLoad] Capture initiated');
    setIsCapturing(false);
    setCapturedImage(imageData);

    try {
      console.log('[SnapLoad] Adding new snag to database...');
      const newSnagId = crypto.randomUUID();
      console.log('[SnapLoad] Generated new snag ID:', newSnagId);
      
      const defaultName = `Screen Capture ${new Date().toLocaleString()}`;
      setName(defaultName);
      
      const newSnag = {
        id: newSnagId,
        projectName,
        name: defaultName,
        description: '',
        photoPath: imageData,
        priority: 'Medium',
        status: 'In Progress',
        assignedTo: '',
        location: '',
        observationDate: new Date(),
        annotations: []
      };

      const createdSnag = await addSnag(newSnag);
      console.log('[SnapLoad] Successfully added snag to database:', createdSnag);
      
      createdSnagRef.current = createdSnag;
      setSnagId(newSnagId);
      setIsAnnotating(true);
    } catch (error) {
      console.error('[SnapLoad] Failed to create snag:', error);
      toast.error('Failed to create snag');
      setCapturedImage(null);
      setSnagId(null);
      createdSnagRef.current = null;
    }
  };

  const startRecording = async () => {
    console.log('[SnapLoad] Starting audio recording...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        console.log('[SnapLoad] Audio data chunk received');
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        console.log('[SnapLoad] Recording stopped, preparing for transcription');
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.current.start();
      console.log('[SnapLoad] MediaRecorder started successfully');
      setIsRecording(true);
    } catch (error) {
      console.error('[SnapLoad] Error starting recording:', error);
      toast.error('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    console.log('[SnapLoad] Stopping recording...');
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      console.log('[SnapLoad] Recording stopped and tracks cleared');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    console.log('[SnapLoad] Starting audio transcription...');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      console.log('[SnapLoad] Sending audio for transcription');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed with status: ${response.status}`);
      }
      
      const { text } = await response.json();
      console.log('[SnapLoad] Received transcription:', text);
      
      if (!text) throw new Error('No transcription received');
      
      setDescription(prev => {
        const newDescription = prev + (prev ? ' ' : '') + text;
        console.log('[SnapLoad] Updated description:', newDescription);
        return newDescription;
      });
    } catch (error) {
      console.error('[SnapLoad] Transcription error:', error);
      toast.error('Failed to transcribe audio');
    }
  };

  const handleAnnotationSave = async (newAnnotations: any[]) => {
    console.log('[SnapLoad] Saving annotations...', {
      snagId,
      annotationsCount: newAnnotations.length,
      description,
      name,
      createdSnag: createdSnagRef.current
    });

    const snagToUpdate = createdSnagRef.current;
    if (!snagToUpdate || !snagToUpdate.id) {
      console.error('[SnapLoad] Cannot save - no valid snag found in ref');
      toast.error('Failed to save annotations - snag reference lost');
      return;
    }

    try {
      console.log('[SnapLoad] Updating snag in database...', {
        snagId: snagToUpdate.id,
        annotationsCount: newAnnotations.length,
        name
      });
      
      await updateSnag(snagToUpdate.id, {
        annotations: newAnnotations,
        description,
        name
      });
      
      console.log('[SnapLoad] Successfully saved snag updates');
      toast.success('Entry saved successfully');
      
      // Clear all state
      setIsAnnotating(false);
      setCapturedImage(null);
      setSnagId(null);
      setDescription('');
      setName('');
      setAnnotations([]);
      createdSnagRef.current = null;
      
      onComplete();
    } catch (error) {
      console.error('[SnapLoad] Failed to save annotations:', error);
      toast.error('Failed to save annotations');
    }
  };

  const generateNameFromDescription = async () => {
    if (!description) {
      toast.error('Add a description first to generate a name');
      return;
    }

    try {
      console.log('[SnapLoad] Generating name from description:', description);
      const response = await fetch('/api/generate-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) throw new Error('Failed to generate name');
      
      const { name: generatedName } = await response.json();
      console.log('[SnapLoad] Generated name:', generatedName);
      
      if (generatedName && generatedName !== name) {
        setName(generatedName);
        toast.success('Name generated successfully');
      }
    } catch (error) {
      console.error('[SnapLoad] Error generating name:', error);
      toast.error('Failed to generate name');
    }
  };

  if (isAnnotating && capturedImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-[95vw] h-[90vh] flex flex-col">
          <div className="flex-1 relative">
            <ImageAnnotator
              imageUrl={capturedImage}
              existingAnnotations={[]}
              onSave={handleAnnotationSave}
              onClose={() => {
                console.log('[SnapLoad] Closing annotation view');
                setIsAnnotating(false);
                setCapturedImage(null);
                setSnagId(null);
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3 z-[100]">
              <div className="flex items-center gap-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Entry name..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateNameFromDescription}
                  className={cn(
                    'transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  title="Generate name from description"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    'transition-colors',
                    isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''
                  )}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCapturing) {
    return (
      <ScreenCapture
        onCapture={handleCapture}
        onCancel={() => {
          console.log('[SnapLoad] Canceling screen capture');
          setIsCapturing(false);
        }}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <Button
      onClick={() => {
        console.log('[SnapLoad] Initiating screen capture');
        setIsCapturing(true);
      }}
      variant="outline"
      className={cn(
        'flex items-center gap-2',
        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
      )}
      title="SnapLoad - Capture and annotate screen area"
    >
      <Maximize className="h-4 w-4" />
      <span className="hidden sm:inline">SnapLoad</span>
    </Button>
  );
} 