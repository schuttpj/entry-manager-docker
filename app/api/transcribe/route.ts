import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
});

// Route segment config
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert Blob to File with .wav extension
    const file = new File([audioFile], 'recording.wav', { type: 'audio/wav' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en",
    });

    if (!transcription.text) {
      return NextResponse.json(
        { error: 'No transcription generated' },
        { status: 500 }
      );
    }

    console.log('Transcription successful:', transcription.text);
    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    
    // Check if it's an OpenAI API error
    if (error.response?.data?.error) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.response.data.error.message}` },
        { status: 500 }
      );
    }

    // Handle other types of errors
    return NextResponse.json(
      { error: `Failed to transcribe audio: ${error.message}` },
      { status: 500 }
    );
  }
} 