import { getDB } from './db';

export async function getSnagDetails(snagNumber: number) {
  try {
    console.log('🔍 Looking up snag details for number:', snagNumber);
    const db = await getDB();
    const index = db.transaction('snags', 'readonly').store.index('by-snagNumber');
    const snag = await index.get(snagNumber);
    
    if (snag) {
      console.log('✨ Found snag:', {
        snagNumber: snag.snagNumber,
        description: snag.description,
        priority: snag.priority,
        status: snag.status
      });
    } else {
      console.log('❌ No snag found with number:', snagNumber);
    }
    
    return snag;
  } catch (error) {
    console.error('❌ Error fetching snag details:', error);
    throw error;
  }
}

export async function querySnags(options: {
  projectName?: string;
  status?: 'In Progress' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
} = {}) {
  try {
    console.log('🔍 Querying snags with options:', options);
    const db = await getDB();
    const tx = db.transaction('snags', 'readonly');
    const store = tx.objectStore('snags');
    
    let snags = await store.getAll();
    
    // Apply filters
    if (options.projectName) {
      snags = snags.filter(snag => snag.projectName === options.projectName);
    }
    if (options.status) {
      snags = snags.filter(snag => snag.status === options.status);
    }
    if (options.priority) {
      snags = snags.filter(snag => snag.priority === options.priority);
    }
    if (options.assignedTo) {
      snags = snags.filter(snag => snag.assignedTo === options.assignedTo);
    }
    
    console.log('✨ Found snags:', {
      total: snags.length,
      filtered: true,
      sampleSnag: snags[0] ? {
        snagNumber: snags[0].snagNumber,
        description: snags[0].description
      } : null
    });
    
    return snags;
  } catch (error) {
    console.error('❌ Error querying snags:', error);
    throw error;
  }
}

export async function getAllSnagNumbers(): Promise<number[]> {
  try {
    console.log('🔍 Getting all snag numbers');
    const db = await getDB();
    const tx = db.transaction('snags', 'readonly');
    const store = tx.objectStore('snags');
    const snags = await store.getAll();
    const numbers = snags.map(snag => snag.snagNumber).sort((a, b) => a - b);
    
    console.log('✨ Found snag numbers:', numbers);
    return numbers;
  } catch (error) {
    console.error('❌ Error getting snag numbers:', error);
    throw error;
  }
} 