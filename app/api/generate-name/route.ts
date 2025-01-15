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
          content: 'You are a construction site snag list assistant. Generate an extremely concise name for a snag based on the image provided. The name MUST follow these rules:\n- Maximum 3 words\n- No articles (a, an, the)\n- Focus on the main issue/defect\n- Be specific and professional\n- Start with the issue type (e.g., "Cracked", "Missing", "Damaged")\nExamples:\n"Cracked Bathroom Tile"\n"Missing Door Handle"\n"Damaged Wall Paint"'
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