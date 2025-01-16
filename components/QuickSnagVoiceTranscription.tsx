import { useState, useRef, useEffect } from 'react';
import { MicOff } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickSnagVoiceTranscriptionProps {
  snagId: string;
  onSnagUpdate: (updates: { description: string }) => void;
  isDarkMode?: boolean;
  onClose: () => void;
}

export function QuickSnagVoiceTranscription({
  snagId,
  onSnagUpdate,
  isDarkMode = false,
  onClose,
}: QuickSnagVoiceTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start recording immediately when component mounts
  useEffect(() => {
    startRecording();
    return () => {
      if (mediaRecorder.current && isRecording) {
        stopRecording();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      // Set up audio visualization
      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);
      
      // Start visualization
      visualize();

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
      toast.error('Failed to start recording. Please check your microphone permissions.');
      onClose();
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }
      
      const { text } = await response.json();
      if (!text) throw new Error('No transcription received');
      
      // Directly update the snag description
      onSnagUpdate({ description: text });
      toast.success('Description updated successfully');
      onClose();
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio. Please try again.');
      onClose();
    }
  };

  const visualize = () => {
    if (!canvasRef.current || !analyser.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyser.current || !canvasCtx) return;

      animationFrame.current = requestAnimationFrame(draw);
      analyser.current.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = isDarkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = isDarkMode ? '#60A5FA' : '#2563EB';
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  return (
    <div 
      className={cn(
        'fixed z-[9999] p-3 rounded-lg shadow-lg w-[200px] transition-all duration-200',
        isDarkMode ? 'bg-gray-800/90 text-white' : 'bg-white/90 text-gray-900'
      )}
      style={{
        left: '50%',
        top: '20%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-full">
          <canvas 
            ref={canvasRef} 
            width={180} 
            height={60}
            className="rounded-lg"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={stopRecording}
          className={cn(
            'h-8 w-8 rounded-full',
            isRecording && 'text-red-500 animate-pulse'
          )}
        >
          <MicOff className="h-4 w-4" />
        </Button>

        {isTranscribing && (
          <div className="text-xs text-center">
            Transcribing...
          </div>
        )}
      </div>
    </div>
  );
} 