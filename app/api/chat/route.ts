import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

// Route segment config
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Initialize OpenAI with a default empty string if no API key is provided
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ''
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

async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
    console.log(`🔍 Initiating web search for query: "${query}"`);
    
    // Get the correct API URL from environment variables
    const searchApiUrl = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:3001/api/search';
    console.log(`🌐 Making request to: ${searchApiUrl}`);
    
    const searchResult = await fetch(searchApiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    console.log(`📡 Response status: ${searchResult.status} ${searchResult.statusText}`);

    if (!searchResult.ok) {
      const errorData = await searchResult.json().catch(() => ({}));
      console.error('❌ Search request failed:', {
        status: searchResult.status,
        statusText: searchResult.statusText,
        error: errorData
      });
      throw new Error(`Search request failed: ${searchResult.statusText}`);
    }

    const data = await searchResult.json();
    console.log('📦 Raw response data:', data);
    
    if (!data.results || !Array.isArray(data.results)) {
      console.error('❌ Invalid search response format:', data);
      throw new Error('Invalid search response format');
    }

    console.log(`✅ Search successful - Found ${data.results.length} results`);
    if (data.metadata) {
      console.log('📊 Search metadata:', data.metadata);
    }

    return data.results;
  } catch (error) {
    console.error('❌ Web search error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}

export async function POST(req: Request) {
  try {
    console.log('📨 Received chat request');
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      console.error('❌ No messages provided');
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1] as ChatMessage;
    if (lastMessage.role !== 'user') {
      console.error('❌ Last message is not from user');
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    console.log('📝 Processing message:', lastMessage.content);

    // Check if the message requires a web search
    const searchMatch = lastMessage.content.match(/^search:\s*(.+)$/i);
    console.log('🔍 Search pattern match:', searchMatch ? 'Yes' : 'No');
    
    if (searchMatch) {
      console.log('🔎 Search command detected');
      const searchQuery = searchMatch[1];
      console.log(`🔍 Search query extracted: "${searchQuery}"`);
      
      try {
        console.log('🚀 Starting web search...');
        const searchResults = await performWebSearch(searchQuery);
        console.log(`📊 Search results received: ${searchResults.length} items`);
        
        // Format search results for the AI
        const searchContext = searchResults.length > 0
          ? `Here are the search results for "${searchQuery}":\n\n${
            searchResults.map((result, i) => 
              `${i + 1}. ${result.title}\n${result.snippet}\nSource: ${result.link}`
            ).join('\n\n')
          }`
          : `No results found for "${searchQuery}"`;

        console.log('📝 Adding search results to context');
        // Add search results to messages for context
        messages.push({
          role: 'system',
          content: searchContext
        });
      } catch (searchError) {
        console.error('❌ Search operation failed:', searchError);
        // Continue with chat even if search fails
      }
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
- When users ask for information, use the provided search results to give accurate, up-to-date information

Remember to:
- Match the user's level of formality
- Break up long responses into digestible sections
- Use bullet points and lists for clarity when appropriate
- Include examples when they would be helpful
- Reference search results when answering questions about current events or facts`
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