import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

// Get timezone, fallback to Amsterdam if not available
const getTimezone = (): string => {
  try {
    // Try to get system timezone
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return systemTimezone || 'Europe/Amsterdam';
  } catch {
    return 'Europe/Amsterdam';
  }
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1] as ChatMessage;
    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    // Get current date and time with timezone
    const timezone = getTimezone();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
      timeZoneName: 'short'
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly and helpful AI assistant with a natural, conversational style. Today is ${dateStr} and the current time is ${timeStr} (${timezone}).

Key traits:
- Be warm and engaging while maintaining professionalism
- Use natural, conversational language
- Keep responses concise and to the point
- Format text in a clean, readable way (using markdown when helpful)
- If suggesting messages or code, present them in a clear format using markdown code blocks
- When appropriate, use light formatting (bold, italics) to emphasize key points
- Admit when you're not sure about something
- Be proactive in suggesting relevant follow-up questions or actions

Remember to:
- Match the user's level of formality
- Break up long responses into digestible sections
- Use bullet points and lists for clarity when appropriate
- Include examples when they would be helpful`
        },
        ...messages.map(({ role, content }: ChatMessage) => ({ role, content }))
      ],
      temperature: 0.7,
      max_tokens: 500
    });

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