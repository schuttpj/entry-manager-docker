import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Check if we're on the client side
const isClient = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

interface SnagListDB extends DBSchema {
  snags: {
    key: string;
    value: {
      id: string;
      projectName: string;
      snagNumber: number;
      name: string;
      description: string;
      photoPath: string;
      thumbnailPath: string;
      priority: 'Low' | 'Medium' | 'High';
      assignedTo: string;
      status: 'In Progress' | 'Completed';
      location: string;
      createdAt: Date;
      updatedAt: Date;
      completionDate: Date | null;
      observationDate: Date;
      annotations: any[];
    };
    indexes: {
      'by-project': string;
      'by-project-snagNumber': [string, number];
      'by-snagNumber': number;
    };
  };
  projects: {
    key: string;
    value: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: {
      'by-name': string;
    };
  };
  voiceRecordings: {
    key: string;
    value: {
      id: string;
      projectName: string;
      fileName: string;
      audioBlob: Blob;
      transcription?: string;
      processed: boolean;
      createdAt: Date;
    };
    indexes: {
      'by-project': string;
    };
  };
}

let dbInstance: IDBPDatabase<SnagListDB> | null = null;

interface BackupData {
  version: number;
  timestamp: string;
  data: {
    snags: SnagListDB['snags']['value'][];
    projects: SnagListDB['projects']['value'][];
    voiceRecordings: Omit<SnagListDB['voiceRecordings']['value'], 'audioBlob'>[];
  };
}

export async function getDB(): Promise<IDBPDatabase<SnagListDB>> {
  if (!isClient) {
    console.error('❌ Attempted to access IndexedDB in server context');
    throw new Error('IndexedDB is only available in browser context');
  }

  if (dbInstance) {
    return dbInstance;
  }

  console.log('🔄 Initializing database connection...');
  
  try {
    dbInstance = await openDB<SnagListDB>('snaglist-db', 3, {
      async upgrade(db, oldVersion, newVersion) {
        console.log('🔧 Running database upgrade...', { oldVersion, newVersion });
        
        // Delete old stores if they exist (to handle schema changes)
        if (oldVersion > 0) {
          if (db.objectStoreNames.contains('snags')) {
            db.deleteObjectStore('snags');
          }
          if (db.objectStoreNames.contains('projects')) {
            db.deleteObjectStore('projects');
          }
          if (db.objectStoreNames.contains('voiceRecordings')) {
            db.deleteObjectStore('voiceRecordings');
          }
        }
        
        // Create stores with new schema
        console.log('📝 Creating stores...');
        const snagStore = db.createObjectStore('snags', { keyPath: 'id' });
        snagStore.createIndex('by-project', 'projectName');
        snagStore.createIndex('by-project-snagNumber', ['projectName', 'snagNumber'], { unique: true });
        snagStore.createIndex('by-snagNumber', 'snagNumber', { unique: false });

        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-name', 'name', { unique: false });

        const voiceStore = db.createObjectStore('voiceRecordings', { keyPath: 'id' });
        voiceStore.createIndex('by-project', 'projectName');

        // Add sample data using the version change transaction
        const projectId = crypto.randomUUID();
        const now = new Date();

        try {
          // Add project using the existing transaction
          await projectStore.add({
            id: projectId,
            name: 'Sample Project',
            createdAt: now,
            updatedAt: now
          });

          // Add sample snag using the existing transaction
          await snagStore.add({
            id: crypto.randomUUID(),
            projectName: 'Sample Project',
            snagNumber: 1,
            name: 'Sample Entry',
            description: 'This is a sample entry to demonstrate the application functionality.',
            photoPath: '/placeholder.jpg',
            thumbnailPath: '/placeholder-thumb.jpg',
            priority: 'Medium' as const,
            assignedTo: 'Demo User',
            status: 'In Progress' as const,
            location: 'General',
            createdAt: now,
            updatedAt: now,
            completionDate: null,
            observationDate: now,
            annotations: []
          });

          console.log('✅ Sample data added successfully');
        } catch (error) {
          console.error('❌ Error adding sample data:', error);
        }
      },
    });

    console.log('✅ Database initialization complete', {
      name: dbInstance.name,
      version: dbInstance.version,
      stores: dbInstance.objectStoreNames
    });

    return dbInstance;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Project operations
export async function addProject(name: string) {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = new Date();
  
  await db.add('projects', {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  });
  
  return { id, name };
}

export async function getAllProjects() {
  const db = await getDB();
  return await db.getAll('projects');
}

export async function getProject(id: string) {
  const db = await getDB();
  return await db.get('projects', id);
}

export async function deleteProject(id: string) {
  console.log('🗑️ Starting to delete project:', id);
  
  try {
    const db = await getDB();
    
    // Get project details before deletion
    const project = await db.get('projects', id);
    if (!project) {
      console.warn('⚠️ Attempted to delete non-existent project:', id);
      return;
    }
    
    console.log('📋 Found project to delete:', {
      id: project.id,
      name: project.name
    });

    // Start a transaction that includes all stores we need to modify
    const tx = db.transaction(['projects', 'snags', 'voiceRecordings'], 'readwrite');
    
    try {
      // Delete all snags associated with the project
      const snagIndex = tx.objectStore('snags').index('by-project');
      const snags = await snagIndex.getAllKeys(project.name);
      console.log(`🗑️ Deleting ${snags.length} snags for project:`, project.name);
      
      for (const snagId of snags) {
        await tx.objectStore('snags').delete(snagId);
      }
      
      // Delete all voice recordings associated with the project
      const voiceIndex = tx.objectStore('voiceRecordings').index('by-project');
      const recordings = await voiceIndex.getAllKeys(project.name);
      console.log(`🗑️ Deleting ${recordings.length} voice recordings for project:`, project.name);
      
      for (const recordingId of recordings) {
        await tx.objectStore('voiceRecordings').delete(recordingId);
      }
      
      // Finally delete the project itself
      await tx.objectStore('projects').delete(id);
      
      // Commit the transaction
      await tx.done;
      console.log('✅ Successfully deleted project and all associated data');
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error deleting project:', error);
    console.error('📄 Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      name: error?.name || 'Unknown error type'
    });
    throw error;
  }
}

// Snag operations
export async function getAllSnags() {
  const db = await getDB();
  return await db.getAll('snags');
}

export async function getSnagsByProject(projectName: string) {
  const db = await getDB();
  const index = db.transaction('snags').store.index('by-project');
  return await index.getAll(projectName);
}

export async function addSnag({
  projectName,
  name,
  description,
  photoPath,
  thumbnailPath,
  priority,
  assignedTo,
  status,
  location,
  completionDate = null,
  observationDate = new Date(),
  annotations = []
}: {
  projectName: string;
  name: string;
  description: string;
  photoPath: string;
  thumbnailPath: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'In Progress' | 'Completed';
  location: string;
  completionDate?: Date | null;
  observationDate?: Date;
  annotations?: any[];
}) {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = new Date();

  // Get the next snag number for this project
  const snagIndex = db.transaction('snags', 'readonly')
    .store
    .index('by-project');
  
  const existingSnags = await snagIndex.getAll(projectName);
  const snagNumber = existingSnags.length + 1;

  const snag = {
    id,
    projectName,
    snagNumber,
    name,
    description,
    photoPath,
    thumbnailPath,
    priority,
    assignedTo,
    status,
    location,
    createdAt: now,
    updatedAt: now,
    completionDate,
    observationDate,
    annotations
  };

  await db.add('snags', snag);
  return snag;
}

export async function updateSnag(id: string, updates: Partial<Omit<SnagListDB['snags']['value'], 'id' | 'snagNumber'>>) {
  const db = await getDB();
  const snag = await db.get('snags', id);
  
  if (!snag) {
    throw new Error('Snag not found');
  }
  
  const updatedSnag = {
    ...snag,
    ...updates,
    updatedAt: new Date(),
    // Only set completion date to current date if status is Completed and no completion date was provided
    completionDate: updates.status === 'Completed' && !updates.completionDate ? new Date() : updates.completionDate || snag.completionDate
  };
  
  await db.put('snags', updatedSnag);
  return updatedSnag;
}

export async function deleteSnag(id: string) {
  console.log('🗑️ Starting to delete snag:', id);
  
  try {
    const db = await getDB();
    
    // Get the snag details before deletion for logging
    const snag = await db.get('snags', id);
    console.log('📋 Found snag to delete:', snag ? {
      id: snag.id,
      projectName: snag.projectName,
      snagNumber: snag.snagNumber,
      name: snag.name
    } : 'No snag found');

    if (!snag) {
      console.warn('⚠️ Attempted to delete non-existent snag:', id);
      return;
    }

    console.log('🗑️ Deleting snag from database...');
    await db.delete('snags', id);
    console.log('✅ Successfully deleted snag:', id);
  } catch (error: any) {
    console.error('❌ Error deleting snag:', error);
    console.error('📄 Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      name: error?.name || 'Unknown error type'
    });
    throw error;
  }
}

// Voice recording operations
export async function saveVoiceRecording(
  projectName: string,
  fileName: string,
  audioBlob: Blob
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = new Date();

  const recording = {
    id,
    projectName,
    fileName,
    audioBlob,
    processed: false,
    createdAt: now,
  };

  await db.add('voiceRecordings', recording);
  return id;
}

export async function getVoiceRecording(id: string) {
  const db = await getDB();
  return await db.get('voiceRecordings', id);
}

export async function getVoiceRecordingsByProject(projectName: string) {
  const db = await getDB();
  const index = db.transaction('voiceRecordings').store.index('by-project');
  return await index.getAll(projectName);
}

// Snag annotation operations
export async function updateSnagAnnotations(snagId: string, annotations: any[]) {
  const db = await getDB();
  const snag = await db.get('snags', snagId);
  
  if (!snag) {
    throw new Error('Snag not found');
  }
  
  const updatedSnag = {
    ...snag,
    annotations,
    updatedAt: new Date()
  };
  
  await db.put('snags', updatedSnag);
  return updatedSnag;
}

export async function searchSnags(query: string) {
  const db = await getDB();
  const allSnags = await getAllSnags();
  
  // Search in description, name, location, and assignedTo fields
  const searchTerms = query.toLowerCase().split(/\s+/);
  
  return allSnags.filter(snag => {
    const searchableText = `
      ${snag.description} 
      ${snag.name} 
      ${snag.location} 
      ${snag.assignedTo}
      ${snag.priority}
      ${snag.status}
    `.toLowerCase();
    
    return searchTerms.every(term => searchableText.includes(term));
  });
}

export async function createBackup(): Promise<BackupData> {
  console.log('📦 Creating database backup...');
  const db = await getDB();
  
  try {
    // Fetch all data from stores
    const snags = await db.getAll('snags');
    const projects = await db.getAll('projects');
    const voiceRecordings = await db.getAll('voiceRecordings');
    
    // Create backup object
    const backup: BackupData = {
      version: db.version,
      timestamp: new Date().toISOString(),
      data: {
        snags,
        projects,
        // Exclude large binary data from backup
        voiceRecordings: voiceRecordings.map(({ audioBlob, ...rest }) => rest)
      }
    };
    
    console.log('✅ Backup created successfully', {
      snags: backup.data.snags.length,
      projects: backup.data.projects.length,
      recordings: backup.data.voiceRecordings.length
    });
    
    return backup;
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  }
}

export async function restoreFromBackup(backup: BackupData): Promise<void> {
  console.log('📥 Starting database restore...');
  const db = await getDB();
  
  if (backup.version !== db.version) {
    console.warn('⚠️ Backup version mismatch:', {
      backup: backup.version,
      current: db.version
    });
  }
  
  const tx = db.transaction(['snags', 'projects'], 'readwrite');
  
  try {
    // Clear existing data
    await Promise.all([
      tx.objectStore('snags').clear(),
      tx.objectStore('projects').clear()
    ]);
    
    // Restore projects first
    for (const project of backup.data.projects) {
      await tx.objectStore('projects').add(project);
    }
    
    // Restore snags
    for (const snag of backup.data.snags) {
      await tx.objectStore('snags').add(snag);
    }
    
    await tx.done;
    console.log('✅ Backup restored successfully');
  } catch (error) {
    console.error('❌ Error restoring backup:', error);
    throw error;
  }
}

export function downloadBackupFile(backup: BackupData): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `snaglist-backup-${backup.timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 