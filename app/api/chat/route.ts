import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    console.log('📝 Processing chat request...');
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      console.log('❌ No messages provided');
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1] as ChatMessage;
    if (lastMessage.role !== 'user') {
      console.log('❌ Last message not from user');
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    console.log('🤖 Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-0125-preview',
      messages: [
        ...messages.map(({ role, content }: ChatMessage) => ({ role, content })),
        {
          role: 'system',
          content: `You are a snag list assistant. Your responses must be based ONLY on the context provided in the system message. If information is not explicitly provided in the context, say "I don't have that information" or "I can't find a snag with that number". Never make assumptions or generate fake data. Format responses in markdown with bullet points and clear headings.

Key rules:
- Only use information explicitly provided in the context
- If a snag number isn't found, say so clearly
- Don't make assumptions about snags or projects not in the context
- If asked about dates, only reference dates from the context
- Keep responses factual and concise`
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log('✅ OpenAI response received');
    return NextResponse.json({
      message: completion.choices[0].message
    });
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to process chat request. Please try again.' },
      { status: 500 }
    );
  }
} 