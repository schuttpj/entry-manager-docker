import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

function enforceThreeWordLimit(name: string): string {
  console.log('🔍 Enforcing word limit on:', name);
  // Remove any quotes that might be in the response
  const cleanName = name.replace(/["']/g, '').trim();
  console.log('📝 After removing quotes:', cleanName);
  // Split by whitespace and take only first 3 words
  const words = cleanName.split(/\s+/).slice(0, 3);
  console.log('📊 Words array:', words);
  // Capitalize first letter of each word
  const result = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  console.log('✨ Final formatted name:', result);
  return result;
}

export async function POST(req: Request) {
  try {
    console.log('📥 Received name generation request');
    const { description } = await req.json();
    console.log('📝 Input description:', description);
    
    if (!description) {
      console.log('❌ No description provided');
      return NextResponse.json(
        { error: 'No description provided' },
        { status: 400 }
      );
    }

    console.log('🤖 Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a construction site snag list assistant. Your task is to extract the main issue from a description and create a concise name. The name MUST follow these rules:\n- Exactly 2-3 words\n- Start with an issue type word (e.g., Damaged, Missing, Incorrect, Peeling)\n- Focus on the primary defect only\n- Be specific but brief\n- No articles or unnecessary words\n\nExamples:\nDescription: "The paint is peeling off near the ceiling corner, revealing primer underneath"\nName: "Peeling Ceiling Paint"\n\nDescription: "A rectangular patch of paint on the wall has incorrect color matching"\nName: "Mismatched Wall Paint"\n\nDescription: "The bathroom door handle is completely missing from the frame"\nName: "Missing Door Handle"'
        },
        {
          role: 'user',
          content: `Extract a 2-3 word name from this description: "${description}". Response must be ONLY the 2-3 word name, nothing else.`
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    console.log('✅ OpenAI response received:', completion.choices[0].message);
    let suggestedName = completion.choices[0].message.content?.trim() || 'Untitled Entry';
    console.log('📋 Initial suggested name:', suggestedName);
    
    // Enforce the three-word limit and proper formatting
    suggestedName = enforceThreeWordLimit(suggestedName);
    
    // If the result is empty or just "Untitled Entry", keep the default
    if (!suggestedName || suggestedName === 'Untitled Entry') {
      console.log('⚠️ Using default name: Untitled Entry');
      suggestedName = 'Untitled Entry';
    }
    
    console.log('✨ Final name:', suggestedName);
    return NextResponse.json({ name: suggestedName });
  } catch (error) {
    console.error('❌ Generate name API error:', error);
    if (error instanceof OpenAI.APIError) {
      console.error('🔥 OpenAI API error details:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type
      });
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