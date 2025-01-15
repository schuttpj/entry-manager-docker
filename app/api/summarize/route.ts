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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that organizes voice notes into well-structured, clear summaries. Format the notes following these guidelines:

1. Start with a clear title based on the main topic(s) discussed
2. Break down the content into logical sections with clear headings
3. Use bullet points for action items, tasks, or key points
4. Add temporal markers (dates, times) when mentioned
5. Highlight important details using markdown formatting

Format example:

# Voice Note Summary

## Action Items
• Call Johnny tomorrow
• Visit site on Wednesday
• Clean swimming pool

## Timeline
• Tomorrow: Phone call with Johnny
• Wednesday: Site visit scheduled

## Additional Notes
• Swimming pool maintenance required
• All other items are in order

Important:
- Keep the tone professional but natural
- Preserve exact names and dates mentioned
- Structure information in a logical, easy-to-read format
- Use markdown formatting for better readability
- Add bullet points for clear task separation`
        },
        {
          role: "user",
          content: `Please organize this voice note into a clear summary: ${text}`
        }
      ],
      temperature: 0.1, // Keep low temperature for consistent formatting
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