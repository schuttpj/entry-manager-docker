import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // Enable client-side usage
});

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
    try {
        // Convert blob to File object
        const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type });

        // Create form data
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('model', 'whisper-1');
        formData.append('language', 'en'); // Set to English, can be made configurable

        // Make API call
        const response = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
        });

        return {
            text: response.text
        };
    } catch (error) {
        console.error('Transcription error:', error);
        return {
            text: '',
            error: error instanceof Error ? error.message : 'Failed to transcribe audio'
        };
    }
} 