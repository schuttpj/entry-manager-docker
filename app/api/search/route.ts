import { NextResponse } from 'next/server';
const SerpApi = require('google-search-results-nodejs');

interface SerpAPIError {
  name: string;
  message: string;
  stack?: string;
}

interface SerpAPISearchResult {
  search_metadata: {
    id: string;
    status: string;
  };
  search_parameters?: {
    engine: string;
    q: string;
  };
  search_information?: {
    total_results?: number;
    time_taken_displayed?: number;
  };
  organic_results?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
  knowledge_graph?: {
    title?: string;
    description?: string;
    source?: {
      link?: string;
    };
  };
  answer_box?: {
    title?: string;
    answer?: string;
    snippet?: string;
    link?: string;
  };
}

export async function POST(req: Request) {
  try {
    console.log('🔍 Starting SerpAPI search request...');
    const { query } = await req.json();

    if (!query) {
      console.error('❌ No search query provided');
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Validate API key
    const apiKey = process.env.SERPAPI_API_KEY || process.env.NEXT_PUBLIC_SERP_API_KEY;
    if (!apiKey) {
      console.error('❌ SERPAPI_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Search API configuration error. Please check API key configuration.' },
        { status: 500 }
      );
    }

    // Initialize SerpApi
    const search = new SerpApi.GoogleSearch(apiKey);

    // Configure search parameters
    const searchParams = {
      q: query,
      location: "Ede, Gelderland, Netherlands",
      google_domain: "google.nl",
      gl: "nl",
      hl: "en",
      num: 5
    };

    console.log('🚀 Sending request to SerpAPI...');
    
    try {
      const searchResult: SerpAPISearchResult = await new Promise((resolve, reject) => {
        search.json(searchParams, (result: SerpAPISearchResult | { error: string }) => {
          if ('error' in result) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });
      });
      
      console.log('📊 Raw SerpAPI response received');
      console.log('Response type:', typeof searchResult);
      console.log('Response keys:', Object.keys(searchResult));

      if (!searchResult.search_metadata?.id) {
        console.error('❌ Invalid SerpAPI response format');
        console.error('Received response:', JSON.stringify(searchResult, null, 2));
        throw new Error('Invalid SerpAPI response format');
      }

      console.log(`✅ Search successful (ID: ${searchResult.search_metadata.id})`);

      // Extract and validate organic results
      const organicResults = searchResult.organic_results || [];
      const knowledgeGraph = searchResult.knowledge_graph || {};
      const weatherResult = searchResult.answer_box || {};

      // Combine results, prioritizing weather and knowledge graph data
      const combinedResults = [];

      // Add weather data if available
      if (weatherResult.title || weatherResult.answer) {
        combinedResults.push({
          title: weatherResult.title || 'Weather Information',
          snippet: weatherResult.answer || weatherResult.snippet || '',
          link: weatherResult.link || ''
        });
      }

      // Add knowledge graph data if available
      if (knowledgeGraph.title) {
        combinedResults.push({
          title: knowledgeGraph.title,
          snippet: knowledgeGraph.description || '',
          link: knowledgeGraph.source?.link || ''
        });
      }

      // Add organic results
      organicResults.forEach((result) => {
        if (result.title || result.link) {
          combinedResults.push({
            title: result.title || 'No title',
            link: result.link || 'No link',
            snippet: result.snippet || 'No snippet available'
          });
        }
      });

      console.log(`✅ Processed ${combinedResults.length} total results`);

      return NextResponse.json({ 
        results: combinedResults,
        metadata: {
          searchId: searchResult.search_metadata.id,
          totalResults: searchResult.search_information?.total_results,
          searchTime: searchResult.search_information?.time_taken_displayed
        }
      });
    } catch (serpError) {
      console.error('❌ SerpAPI execution error:', serpError);
      throw serpError;
    }
  } catch (error) {
    const serpError = error as SerpAPIError;
    console.error('❌ SerpAPI search error:', serpError);
    console.error('Error details:', {
      name: serpError.name,
      message: serpError.message,
      stack: serpError.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to perform search',
        details: serpError.message,
        type: serpError.name
      },
      { status: 500 }
    );
  }
} 