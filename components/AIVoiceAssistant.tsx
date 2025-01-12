import { useState, useEffect, useRef } from 'react';
import { Mic, Info, StopCircle, Play, Trash2, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { saveVoiceRecording, getVoiceRecordingsByProject, getVoiceRecording, getDB } from '@/lib/db';
import { useOpenAI } from '@/hooks/use-openai';

interface VoiceRecording {
  id: string;
  projectName: string;
  fileName: string;
  audioBlob: Blob;
  transcription?: string;
  processed: boolean;
  createdAt: Date;
}

interface AIVoiceAssistantProps {
  isDarkMode?: boolean;
  projectName: string;
}

export function AIVoiceAssistant({ isDarkMode = false, projectName }: AIVoiceAssistantProps) {
  const { isAvailable: isAIAvailable } = useOpenAI();
  const [showInfo, setShowInfo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load recordings when project changes
  useEffect(() => {
    if (projectName) {
      loadRecordings();
    }
  }, [projectName]);

  const loadRecordings = async () => {
    try {
      const projectRecordings = await getVoiceRecordingsByProject(projectName);
      setRecordings(projectRecordings.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading recordings:', error);
      setError('Failed to load recordings');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!projectName) {
      setError('Please select a project first');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      console.log('Created MediaRecorder with mimeType:', mimeType);
      setMediaRecorder(recorder);
      
      // Initialize chunks array
      const chunks: Blob[] = [];
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        console.log('Data available event:', event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
          setAudioChunks(currentChunks => [...currentChunks, event.data]);
        }
      };

      recorder.onstop = async () => {
        try {
          setIsSaving(true);
          console.log('Number of chunks:', chunks.length);
          
          if (chunks.length === 0) {
            throw new Error('No audio chunks captured');
          }
          
          // Create blob from chunks with proper MIME type
          const audioBlob = new Blob(chunks, { type: mimeType });
          
          console.log('Created audio blob:', audioBlob);
          console.log('Blob size:', audioBlob.size);
          console.log('Blob type:', audioBlob.type);
          
          // Verify the blob is valid
          if (audioBlob.size === 0) {
            throw new Error('No audio data captured');
          }

          // Create a timestamp for the filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = mimeType.split('/')[1];
          const fileName = `voice_command_${projectName}_${timestamp}.${extension}`;

          // Save to IndexedDB
          await saveVoiceRecording(projectName, fileName, audioBlob);
          
          // Clear the chunks
          chunks.length = 0;
          setAudioChunks([]);
          
          // Stop all tracks in the stream
          stream.getTracks().forEach(track => track.stop());
          
          // Reload recordings
          await loadRecordings();
          
          setError(null);
        } catch (error: any) {
          console.error('Error saving audio:', error);
          setError(`Failed to save audio recording: ${error?.message || 'Unknown error'}`);
        } finally {
          setIsSaving(false);
        }
      };

      // Request data every 500ms and when stopping
      recorder.start(500);
      console.log('Started recording with timeslice: 500ms');
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const playRecording = async (recordingId: string) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
        setCurrentlyPlaying(null);
      }

      const recording = await getVoiceRecording(recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      console.log('Recording data:', recording);

      // Convert the stored blob data back to a proper blob
      let audioBlob;
      if (recording.audioBlob instanceof Blob) {
        audioBlob = recording.audioBlob;
      } else {
        // Determine the MIME type from the filename
        const extension = recording.fileName.split('.').pop()?.toLowerCase();
        const mimeType = extension === 'webm' ? 'audio/webm' :
                        extension === 'ogg' ? 'audio/ogg' :
                        'audio/mp4';
        
        // If it's not already a Blob (e.g., if it's stored as an ArrayBuffer or similar)
        audioBlob = new Blob([recording.audioBlob], { type: mimeType });
      }
      
      console.log('Audio blob:', audioBlob);
      console.log('Blob type:', audioBlob.type);
      console.log('Blob size:', audioBlob.size);

      // Verify blob is valid
      if (audioBlob.size === 0) {
        throw new Error('Invalid audio data: empty blob');
      }

      // Create a new audio element with specific settings
      const audio = new Audio();
      audio.preload = 'auto';  // Ensure audio is preloaded
      
      // Create object URL directly from the blob
      const objectUrl = URL.createObjectURL(audioBlob);
      
      // Set up event handlers before setting src
      audio.oncanplay = () => {
        console.log('Audio can play, duration:', audio.duration);
      };
      
      audio.onloadedmetadata = () => {
        console.log('Audio metadata loaded, duration:', audio.duration);
      };
      
      audio.onended = () => {
        console.log('Audio playback completed');
        setCurrentlyPlaying(null);
        URL.revokeObjectURL(objectUrl);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        console.error('Audio error details:', audio.error);
        console.error('Audio error code:', audio.error?.code);
        setError(`Failed to play recording: ${audio.error?.message || 'Unknown error'}`);
        URL.revokeObjectURL(objectUrl);
      };

      // Set the source and attempt to play
      audio.src = objectUrl;

      try {
        console.log('Attempting to play audio...');
        // Wait for canplaythrough event before playing
        await new Promise((resolve, reject) => {
          audio.oncanplaythrough = resolve;
          audio.onerror = reject;
          
          // Set a timeout in case the audio never becomes playable
          setTimeout(() => reject(new Error('Timeout waiting for audio to be playable')), 5000);
        });
        
        await audio.play();
        audioRef.current = audio;
        setCurrentlyPlaying(recordingId);
        setError(null);
      } catch (playError: any) {
        console.error('Playback failed:', playError);
        setError(`Failed to play recording: ${playError?.message || 'Unknown error'}`);
        URL.revokeObjectURL(objectUrl);
      }
      
    } catch (error) {
      console.error('Error playing recording:', error);
      setError('Failed to play recording');
    }
  };

  const deleteRecording = async (recordingId: string) => {
    try {
      // Stop if currently playing
      if (currentlyPlaying === recordingId && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setCurrentlyPlaying(null);
      }

      // Optimistically remove from UI
      setRecordings(recordings.filter(rec => rec.id !== recordingId));

      // Delete from database
      const db = await getDB();
      await db.delete('voiceRecordings', recordingId);
    } catch (error) {
      console.error('Error deleting recording:', error);
      setError('Failed to delete recording');
      // Reload recordings to restore state
      await loadRecordings();
    }
  };

  return (
    <div className={`mt-4 rounded-lg shadow p-4 transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-medium transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            AI Voice Assistant
          </h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1 rounded-full transition-colors duration-300 ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        {isRecording && (
          <span className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      {error && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          isDarkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'
        }`}>
          {error}
        </div>
      )}

      {showInfo && (
        <div className={`mb-4 p-3 rounded-lg text-sm transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-600'
        }`}>
          <p className="mb-2">Use voice commands to update entry information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>"Update entry number [X] priority to high"</li>
            <li>"Set status of entry [X] to in progress"</li>
            <li>"Assign entry [X] to John"</li>
            <li>"Add description to entry [X]: [your description]"</li>
          </ul>
        </div>
      )}

      <Button
        className={`w-full flex items-center justify-center gap-2 transition-all duration-300 ${
          isRecording
            ? isDarkMode 
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-red-600 text-white hover:bg-red-700'
            : isDarkMode 
              ? 'bg-white text-gray-900 hover:bg-gray-100' 
              : 'bg-gray-900 text-white hover:bg-gray-800'
        } ${!projectName || isSaving || !isAIAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!projectName || isSaving || !isAIAvailable}
        title={!isAIAvailable ? "AI features are disabled. Add your OpenAI API key to enable voice recording." : undefined}
      >
        {isRecording ? (
          <>
            <StopCircle className="w-4 h-4" />
            <span>Stop Recording</span>
          </>
        ) : isSaving ? (
          <span>Saving...</span>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            <span>Click to Speak</span>
          </>
        )}
      </Button>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="mt-4">
          <h4 className={`text-sm font-medium mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Recent Recordings
          </h4>
          <div className="space-y-2">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {new Date(recording.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => currentlyPlaying === recording.id 
                      ? (audioRef.current?.pause(), setCurrentlyPlaying(null))
                      : playRecording(recording.id)
                    }
                  >
                    <Play className={`w-4 h-4 ${
                      currentlyPlaying === recording.id ? 'text-blue-500' : ''
                    }`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRecording(recording.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                  >
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 