import OpenAI from 'openai';

// Function to check if OpenAI features are available
export const isOpenAIAvailable = () => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    return typeof apiKey === 'string' && apiKey.length > 0;
};

// Initialize OpenAI client only if API key is available
const openai = isOpenAIAvailable() ? new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true // Enable client-side usage
}) : null;

export interface TranscriptionResponse {
    text: string;
    error?: string;
}

/**
 * Transcribe audio using OpenAI Whisper
 * @param audioBlob - The audio blob to transcribe
 * @returns Promise<TranscriptionResponse>
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResponse> {
    // Check if OpenAI is available
    if (!isOpenAIAvailable()) {
        return {
            text: '',
            error: 'OpenAI API key not configured. Voice transcription and AI features are disabled.'
        };
    }

    try {
        // Always use the server-side API route in production
        if (process.env.NODE_ENV === 'production') {
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
            return { text };
        }

        // In development, we can use direct OpenAI API access
        const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type });
        const response = await openai!.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
        });

        return {
            text: response.text
        };
    } catch (error) {
        console.error('Transcription error:', error);
        const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to transcribe audio. Please check your OpenAI API key and try again.';
        return {
            text: '',
            error: errorMessage
        };
    }
} 