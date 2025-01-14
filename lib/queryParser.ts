import { z } from 'zod';

// Define the possible query types
export const QueryType = {
  LIST: 'list',
  SEARCH: 'search',
  FILTER: 'filter',
  COUNT: 'count',
  DETAIL: 'detail',
  ANNOTATION: 'annotation',
  SUMMARY: 'summary',
} as const;

type OperationType = typeof QueryType[keyof typeof QueryType];

// Define the filter criteria schema
export const FilterCriteria = z.object({
  projectName: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['In Progress', 'Completed']).optional(),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  location: z.string().optional(),
  assignedTo: z.string().optional(),
  snagNumber: z.number().optional(),
});

// Define the query intent schema
export const QueryIntent = z.object({
  operation: z.enum(['list', 'search', 'filter', 'count', 'detail', 'annotation', 'summary']),
  filters: FilterCriteria.optional(),
  searchTerm: z.string().optional(),
  limit: z.number().optional(),
  sort: z.object({
    field: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'snagNumber']),
    order: z.enum(['asc', 'desc']),
  }).optional(),
});

// Types based on the schemas
export type FilterCriteriaType = z.infer<typeof FilterCriteria>;
export type QueryIntentType = z.infer<typeof QueryIntent>;

// Helper function to extract date from natural language
function extractDateRange(text: string): { start?: Date; end?: Date } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);

  if (text.includes('today')) {
    return { start: today };
  } else if (text.includes('yesterday')) {
    return { start: yesterday, end: today };
  } else if (text.includes('last week')) {
    return { start: lastWeek, end: today };
  } else if (text.includes('last month')) {
    return { start: lastMonth, end: today };
  }
  
  return {};
}

// Helper function to extract priority from text
function extractPriority(text: string): 'Low' | 'Medium' | 'High' | undefined {
  const lowPriority = text.match(/\b(low|minor)\b/i);
  const mediumPriority = text.match(/\b(medium|moderate)\b/i);
  const highPriority = text.match(/\b(high|urgent|critical)\b/i);

  if (highPriority) return 'High';
  if (mediumPriority) return 'Medium';
  if (lowPriority) return 'Low';
  return undefined;
}

// Helper function to extract status from text
function extractStatus(text: string): 'In Progress' | 'Completed' | undefined {
  const inProgress = text.match(/\b(in progress|ongoing|open|active)\b/i);
  const completed = text.match(/\b(completed|done|finished|closed)\b/i);

  if (inProgress) return 'In Progress';
  if (completed) return 'Completed';
  return undefined;
}

// Helper function to extract snag number from text
function extractSnagNumber(text: string): number | undefined {
  // Match patterns like "entry 5", "snag #5", "snag 5", "#5"
  const patterns = [
    /\b(?:entry|snag)\s*#?\s*(\d+)\b/i,  // matches "entry 5", "snag #5", "snag 5"
    /#(\d+)\b/,                           // matches "#5"
    /\b(\d+)\b/                           // fallback: matches any number
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      console.log('🔍 Found snag number:', {
        pattern: pattern.toString(),
        match: match[1],
        fullMatch: match[0]
      });
      return parseInt(match[1], 10);
    }
  }

  return undefined;
}

// Main function to parse natural language into structured query
export async function parseQuery(text: string): Promise<QueryIntentType> {
  text = text.toLowerCase();
  console.log('🔍 Parsing query text:', text);
  
  // Extract snag number first
  const snagNumber = extractSnagNumber(text);
  console.log('📝 Extracted snag number:', snagNumber);

  // If we found a snag number, this is likely a detail query
  if (snagNumber) {
    console.log('🎯 Detected detail query for snag number:', snagNumber);
    return QueryIntent.parse({
      operation: 'detail',
      filters: {
        snagNumber
      }
    });
  }
  
  // Determine operation type for other queries
  let operation: OperationType = 'list';
  if (text.match(/\b(find|search|look for|where)\b/)) {
    operation = 'search';
  } else if (text.match(/\b(count|how many|total)\b/)) {
    operation = 'count';
  } else if (text.match(/\b(show|list|get)\b/)) {
    operation = 'list';
  } else if (text.match(/\b(details|information about|tell me about)\b/)) {
    operation = 'detail';
  } else if (text.match(/\b(annotations|notes|comments)\b/)) {
    operation = 'annotation';
  } else if (text.match(/\b(summarize|summary|overview)\b/)) {
    operation = 'summary';
  }

  // Extract filters
  const filters: FilterCriteriaType = {
    dateRange: extractDateRange(text),
    priority: extractPriority(text),
    status: extractStatus(text),
  };

  // Extract project name if mentioned
  const projectMatch = text.match(/\bproject\s+([a-z0-9\s]+)\b/i);
  if (projectMatch) {
    filters.projectName = projectMatch[1].trim();
  }

  // Extract location if mentioned
  const locationMatch = text.match(/\bin\s+([a-z0-9\s]+(?:room|area|location|kitchen|bathroom|bedroom))\b/i);
  if (locationMatch) {
    filters.location = locationMatch[1].trim();
  }

  // Extract assigned person if mentioned
  const assignedMatch = text.match(/\b(?:assigned to|by)\s+([a-z0-9\s]+)\b/i);
  if (assignedMatch) {
    filters.assignedTo = assignedMatch[1].trim();
  }

  // Extract sort preferences
  let sort;
  if (text.includes('newest') || text.includes('latest')) {
    sort = { field: 'createdAt' as const, order: 'desc' as const };
  } else if (text.includes('oldest')) {
    sort = { field: 'createdAt' as const, order: 'asc' as const };
  } else if (text.includes('highest priority')) {
    sort = { field: 'priority' as const, order: 'desc' as const };
  }

  // Build and validate the query intent
  const queryIntent: QueryIntentType = {
    operation,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    sort,
    searchTerm: operation === 'search' ? text : undefined,
  };

  // Validate the query intent against the schema
  return QueryIntent.parse(queryIntent);
} 