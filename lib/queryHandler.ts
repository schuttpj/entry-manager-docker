import { QueryIntentType, FilterCriteriaType } from './queryParser';
import { getDB } from './db';

interface QueryResult {
  data?: any[];
  count?: number;
  summary?: string;
  error?: string;
  debug?: any;
}

export async function executeQuery(intent: QueryIntentType): Promise<QueryResult> {
  const debug: any = {
    intent,
    dbAccess: null,
    snags: null,
    filteredSnags: null,
    error: null
  };

  try {
    console.log('🔍 Executing query with intent:', intent);
    
    const db = await getDB();
    console.log('📁 Database connection established');
    
    const store = db.transaction('snags', 'readonly').objectStore('snags');
    console.log('📂 Accessed snags store');
    
    let snags = await store.getAll();
    console.log('📊 Retrieved snags from store:', {
      totalSnags: snags.length,
      sampleSnag: snags[0] ? {
        snagNumber: snags[0].snagNumber,
        name: snags[0].name,
        status: snags[0].status
      } : null
    });

    debug.dbAccess = 'success';
    debug.snags = snags.map(s => ({ snagNumber: s.snagNumber, name: s.name }));

    // Apply filters if they exist
    if (intent.filters) {
      console.log('🔍 Applying filters:', intent.filters);
      snags = filterSnags(snags, intent.filters);
      console.log('✨ After filtering:', { 
        filteredCount: snags.length,
        filters: intent.filters 
      });
      debug.filteredSnags = snags.map(s => ({ snagNumber: s.snagNumber, name: s.name }));
    }

    // Apply sorting if specified
    if (intent.sort) {
      console.log('📊 Applying sort:', intent.sort);
      snags = sortSnags(snags, intent.sort);
    }

    // Handle different operation types
    console.log(`🎯 Executing operation: ${intent.operation}`);
    
    switch (intent.operation) {
      case 'list':
        return {
          data: snags,
          count: snags.length,
          debug
        };

      case 'search':
        if (!intent.searchTerm) return { data: [], debug };
        const searchResults = snags.filter(snag => 
          snag.description.toLowerCase().includes(intent.searchTerm!.toLowerCase()) ||
          snag.name.toLowerCase().includes(intent.searchTerm!.toLowerCase())
        );
        return {
          data: searchResults,
          count: searchResults.length,
          debug
        };

      case 'count':
        return {
          count: snags.length,
          debug
        };

      case 'detail':
        if (!intent.filters?.snagNumber) {
          console.warn('⚠️ No snag number specified for detail query');
          return { error: 'No snag number specified for detail query', debug };
        }
        
        console.log('🔍 Looking for snag number:', intent.filters.snagNumber);
        
        // First try to find by exact snag number
        const snagByNumber = snags.find(s => s.snagNumber === intent.filters?.snagNumber);
        
        if (snagByNumber) {
          console.log('✅ Found snag by number:', {
            snagNumber: snagByNumber.snagNumber,
            description: snagByNumber.description,
            assignedTo: snagByNumber.assignedTo,
            priority: snagByNumber.priority
          });
          
          return {
            data: [snagByNumber],
            count: 1,
            debug: {
              ...debug,
              foundBy: 'exact_number',
              matchedSnag: {
                snagNumber: snagByNumber.snagNumber,
                description: snagByNumber.description
              }
            }
          };
        }
        
        console.log('⚠️ No snag found with exact number:', intent.filters.snagNumber);
        return {
          data: [],
          count: 0,
          debug: {
            ...debug,
            searchedFor: intent.filters.snagNumber,
            availableSnags: snags.map(s => ({
              snagNumber: s.snagNumber,
              description: s.description.substring(0, 50) + '...'
            }))
          }
        };

      case 'annotation':
        const snagsWithAnnotations = snags.filter(snag => 
          snag.annotations && snag.annotations.length > 0
        );
        return {
          data: snagsWithAnnotations,
          count: snagsWithAnnotations.length,
          debug
        };

      case 'summary':
        return {
          data: snags,
          count: snags.length,
          summary: generateSummary(snags),
          debug
        };

      default:
        return { error: 'Unsupported operation type', debug };
    }
  } catch (error) {
    console.error('❌ Query execution error:', error);
    debug.error = error instanceof Error ? error.message : 'Unknown error';
    return { 
      error: 'Failed to execute query', 
      debug 
    };
  }
}

// Helper function to filter snags based on criteria
function filterSnags(snags: any[], filters: FilterCriteriaType): any[] {
  return snags.filter(snag => {
    // Project name filter
    if (filters.projectName && 
        snag.projectName.toLowerCase() !== filters.projectName.toLowerCase()) {
      return false;
    }

    // Priority filter
    if (filters.priority && snag.priority !== filters.priority) {
      return false;
    }

    // Status filter
    if (filters.status && snag.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const snagDate = new Date(snag.createdAt);
      if (filters.dateRange.start && snagDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && snagDate > filters.dateRange.end) {
        return false;
      }
    }

    // Location filter
    if (filters.location && 
        !snag.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }

    // Assigned to filter
    if (filters.assignedTo && 
        snag.assignedTo.toLowerCase() !== filters.assignedTo.toLowerCase()) {
      return false;
    }

    // Snag number filter
    if (filters.snagNumber && snag.snagNumber !== filters.snagNumber) {
      return false;
    }

    return true;
  });
}

// Helper function to sort snags
function sortSnags(snags: any[], sort: NonNullable<QueryIntentType['sort']>): any[] {
  return [...snags].sort((a, b) => {
    const aValue = a[sort.field];
    const bValue = b[sort.field];
    
    if (sort.order === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
    }
  });
}

// Helper function to generate summary
function generateSummary(snags: any[]): string {
  const total = snags.length;
  const byStatus = snags.reduce((acc: any, snag) => {
    acc[snag.status] = (acc[snag.status] || 0) + 1;
    return acc;
  }, {});
  const byPriority = snags.reduce((acc: any, snag) => {
    acc[snag.priority] = (acc[snag.priority] || 0) + 1;
    return acc;
  }, {});

  return `Found ${total} snags. ` +
    `Status breakdown: ${Object.entries(byStatus).map(([status, count]) => 
      `${status}: ${count}`).join(', ')}. ` +
    `Priority breakdown: ${Object.entries(byPriority).map(([priority, count]) => 
      `${priority}: ${count}`).join(', ')}.`;
} 