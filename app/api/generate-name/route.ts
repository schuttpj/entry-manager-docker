import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    const { imageData, projectName } = await req.json();
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a construction site snag list assistant. Generate a concise but descriptive name for a snag based on the image provided. The name should be professional and clearly indicate the issue or area of concern. Keep it under 50 characters.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Generate a name for this snag in project: ${projectName}` },
            { type: 'image_url', image_url: { url: imageData } }
          ]
        }
      ],
      max_tokens: 50
    });

    const suggestedName = completion.choices[0].message.content?.trim() || 'Untitled Entry';
    
    return NextResponse.json({ name: suggestedName });
  } catch (error) {
    console.error('Generate name API error:', error);
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate name. Please try again.' },
      { status: 500 }
    );
  }
} 