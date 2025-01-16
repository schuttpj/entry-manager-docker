import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ''
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
    const body = await req.json();
    console.log('📦 Request body:', body);
    const { description } = body;
    console.log('📝 Input description:', description);
    
    if (!description) {
      console.log('❌ No description provided');
      return NextResponse.json(
        { error: 'No description provided' },
        { status: 400 }
      );
    }

    // Debug OpenAI configuration
    console.log('🔑 OpenAI API Key status:', {
      hasKey: !!openai.apiKey,
      keyLength: openai.apiKey?.length || 0,
      keyPrefix: openai.apiKey ? openai.apiKey.substring(0, 3) : 'none'
    });

    if (!openai.apiKey) {
      console.error('❌ No OpenAI API key configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('🤖 Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a construction site snag list assistant. Your task is to extract the main topic from a description and create a concise name. The name MUST follow these rules:
- Exactly 2-3 words
- Start with a descriptive word that categorizes the content (e.g., Kitchen, Bedroom, Bathroom, Layout, Design, Plan)
- Focus on the primary subject
- Be specific but brief
- No articles or unnecessary words
- Use proper capitalization

Examples:
Description: "The paint is peeling off near the ceiling corner, revealing primer underneath"
Name: "Peeling Ceiling Paint"

Description: "A rectangular patch of paint on the wall has incorrect color matching"
Name: "Mismatched Wall Paint"

Description: "A detailed sketch illustrates a modern kitchen featuring sleek cabinets"
Name: "Modern Kitchen Design"

Description: "The floor plan shows a spacious layout with two bedrooms"
Name: "Residential Floor Plan"`
        },
        {
          role: 'user',
          content: `Extract a 2-3 word name from this description: "${description}". Response must be ONLY the 2-3 word name, nothing else.`
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    console.log('✅ OpenAI response received:', {
      content: completion.choices[0].message.content,
      finishReason: completion.choices[0].finish_reason,
      model: completion.model,
      usage: completion.usage
    });

    let suggestedName = completion.choices[0].message.content?.trim() || 'Untitled Entry';
    console.log('📋 Initial suggested name:', suggestedName);
    
    // Enforce the three-word limit and proper formatting
    suggestedName = enforceThreeWordLimit(suggestedName);
    console.log('🔍 After enforcing word limit:', suggestedName);
    
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