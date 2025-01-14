import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Create OpenAI client once
console.log('Environment check:', {
  hasNextPublicKey: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  nextPublicKeyLength: process.env.NEXT_PUBLIC_OPENAI_API_KEY?.length,
  openaiKeyLength: process.env.OPENAI_API_KEY?.length
});

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',  // Try both keys
});

export async function POST(request: Request) {
  try {
    console.log('Starting summarize request');
    console.log('OpenAI client check:', {
      hasApiKey: !!openai.apiKey,
      apiKeyLength: openai.apiKey?.length
    });
    const { text } = await request.json();
    console.log('Received text length:', text?.length);

    if (!text) {
      console.log('No text provided');
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Check for either API key
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('Making OpenAI API call...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a summarizer for construction site notes and change requests. The transcripts will contain verbal notes about changes needed for existing entries. Extract and format the changes with these rules:

1. Listen for mentions of entry numbers and their requested changes
2. For each mentioned entry, summarize the requested changes in this format:

Entry #[number]
Changes Requested:
- Priority: [any priority changes, e.g. "Change from Low to High"]
- Action: [what needs to be done by who and by when]
- Assignment: [if someone is assigned]
- Timeline: [if a deadline is mentioned]

[Leave a blank line between entries]

Example:
Entry #5
Changes Requested:
- Priority: Change from Low to High
- Action: Inspect carpet damage on site
- Assignment: Ethan Brown to handle
- Timeline: Must be done by Friday

[Leave a blank line between entries]

Entry #2
Changes Requested:
- Priority: Change from Medium to Low
- Action: Review updated specifications
- Timeline: Next week

Important:
- Keep entries in the order mentioned in the transcript
- Only include fields that are explicitly mentioned
- Preserve exact names, dates, and entry numbers
- Focus on capturing the requested changes and new information`
        },
        {
          role: "user",
          content: `Please summarize the changes requested in this transcription: ${text}`
        }
      ],
      temperature: 0.1, // Lower temperature for more consistent formatting
    });

    console.log('OpenAI API response received:', completion);

    if (!completion.choices[0]?.message?.content) {
      console.error('No content in OpenAI response:', completion);
      throw new Error('Invalid response from OpenAI');
    }

    const summary = completion.choices[0].message.content;
    console.log('Generated summary length:', summary.length);

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Detailed error in summarize route:', {
      error,
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    // Check if it's an OpenAI API error
    if (error.response?.data?.error) {
      console.error('OpenAI API error:', error.response.data.error);
      return NextResponse.json(
        { error: `OpenAI API error: ${error.response.data.error.message}` },
        { status: 500 }
      );
    }

    // Handle other types of errors
    const errorMessage = error.message || 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate summary: ${errorMessage}` },
      { status: 500 }
    );
  }
} 