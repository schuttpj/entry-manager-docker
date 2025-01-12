import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { headers } from 'next/headers';

function checkIndexedDBSupport(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function GET() {
  const userAgent = 'user-agent';

  try {
    // Test database connection
    await getDB();
    
    // Check for storage estimate capability
    const storageEstimate = typeof navigator !== 'undefined' && 
      'storage' in navigator && 
      'estimate' in navigator.storage
      ? await navigator.storage.estimate()
      : 'unavailable';
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      browser: {
        userAgent,
        indexedDBSupport: checkIndexedDBSupport(),
        storageEstimate
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      browser: {
        userAgent,
        indexedDBSupport: checkIndexedDBSupport(),
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 