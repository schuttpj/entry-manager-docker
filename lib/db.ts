import { openDB, DBSchema, IDBPDatabase, IDBPTransaction } from 'idb';
import { Annotation } from '../types/snag';

// Add connection status monitoring
let dbInstance: IDBPDatabase<SnagListDB> | null = null;
let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
const connectionListeners: Set<(status: typeof connectionStatus) => void> = new Set();

export function addConnectionListener(listener: (status: typeof connectionStatus) => void) {
  connectionListeners.add(listener);
  // Immediately notify the listener of the current status
  listener(connectionStatus);
  return () => connectionListeners.delete(listener);
}

function updateConnectionStatus(newStatus: typeof connectionStatus) {
  connectionStatus = newStatus;
  connectionListeners.forEach(listener => listener(newStatus));
}

interface SnagListDB {
  snags: SnagListDBSchema['snags'];
  projects: SnagListDBSchema['projects'];
}

interface SnagListDBSchema {
  snags: {
    key: string;
    value: {
      id: string;
      projectName: string;
      snagNumber: number;
      name: string;
      description: string;
      photoPath: string;
      priority: 'Low' | 'Medium' | 'High';
      assignedTo: string;
      status: 'In Progress' | 'Completed';
      location: string;
      createdAt: Date;
      updatedAt: Date;
      annotations: Annotation[];
    };
    indexes: {
      'by-project': string;
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
}

interface SnagUpdate {
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  status?: 'In Progress' | 'Completed';
  location?: string;
  completionDate?: string | Date | null;
}

const DB_NAME = 'snag-list-db';
const DB_VERSION = 10;

export async function initDB(): Promise<IDBPDatabase<SnagListDB>> {
  try {
    const db = await openDB<SnagListDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, newVersion) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('snags')) {
          const snagStore = db.createObjectStore('snags', { keyPath: 'id' });
          snagStore.createIndex('by-project', 'projectName');
        }
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-name', 'name', { unique: false });
        }

        // Version 7: Add name field to snags
        if (oldVersion < 7) {
          const store = db.transaction('snags', 'readwrite').objectStore('snags');
          const snags = await store.getAll();
          
          for (const snag of snags) {
            if (!snag.name) {
              snag.name = snag.description ? snag.description.split(/\s+/).slice(0, 5).join(' ') : 'Untitled Snag';
              await store.put(snag);
            }
          }
        }

        // Version 8: Update 'Open' status to 'In Progress'
        if (oldVersion < 8) {
          const store = db.transaction('snags', 'readwrite').objectStore('snags');
          const snags = await store.getAll();
          
          for (const snag of snags) {
            if (snag.status === 'Open') {
              snag.status = 'In Progress';
              snag.updatedAt = new Date();
              await store.put(snag);
            }
          }
        }

        // Version 10: Add location field to snags
        if (oldVersion < 10) {
          const store = db.transaction('snags', 'readwrite').objectStore('snags');
          const snags = await store.getAll();
          
          for (const snag of snags) {
            if (!snag.location) {
              snag.location = '';  // Initialize with empty string
              snag.updatedAt = new Date();
              await store.put(snag);
            }
          }
        }
      },
    });

    updateConnectionStatus('connected');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    updateConnectionStatus('error');
    throw error;
  }
}

export async function getDB(): Promise<IDBPDatabase<SnagListDB>> {
  try {
    return await initDB();
  } catch (error) {
    updateConnectionStatus('error');
    throw error;
  }
}

// Helper function to get the next snag number for a project
async function getNextSnagNumber(
  tx: IDBPTransaction<SnagListDB, ['snags'], 'readwrite'>, 
  projectName: string
): Promise<number> {
  try {
    const store = tx.objectStore('snags');
    const index = store.index('by-project');
    const snags = await index.getAll(projectName);
    const numbers = snags.map((snag: SnagListDB['snags']['value']) => snag.snagNumber || 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch (error) {
    console.error('Error getting next snag number:', error);
    throw error;
  }
}

// Helper function to generate AI name from description
async function generateAIName(description: string): Promise<string> {
  if (!description) return 'Untitled Snag';
  
  // Check for API key
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not found. Falling back to simple text extraction.');
    return description.split(/\s+/).slice(0, 5).join(' ') || 'Untitled Snag';
  }
  
  console.log('Attempting OpenAI API call for description:', description);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates concise (5 words or less) titles from description text. The titles should be clear and descriptive."
          },
          {
            role: "user",
            content: `Generate a concise title from this description: "${description}"`
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      if (response.status === 401) {
        console.error('Invalid API key. Please check your OpenAI API key.');
      } else if (response.status === 429) {
        console.error('Rate limit exceeded. Please try again later.');
      }
      
      return description.split(/\s+/).slice(0, 5).join(' ') || 'Untitled Snag';
    }

    const data = await response.json();
    console.log('OpenAI API response:', {
      success: true,
      data: data.choices?.[0]?.message?.content,
      fullResponse: data
    });

    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected API response format:', data);
      return description.split(/\s+/).slice(0, 5).join(' ') || 'Untitled Snag';
    }

    const generatedName = data.choices[0].message.content.trim();
    console.log('Generated name from OpenAI:', generatedName);
    return generatedName || 'Untitled Snag';
  } catch (error) {
    console.error('Error generating AI name:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return description.split(/\s+/).slice(0, 5).join(' ') || 'Untitled Snag';
  }
}

// Snag CRUD operations
export async function addSnag(snag: Omit<SnagListDB['snags']['value'], 'id' | 'createdAt' | 'updatedAt' | 'snagNumber' | 'annotations' | 'name'>) {
  const db = await getDB();
  
  try {
    // Prepare all async data before starting the transaction
    const id = crypto.randomUUID();
    const now = new Date();
    const name = await generateAIName(snag.description);
    
    // Start a new transaction for getting the snag number and adding the snag
    const tx = db.transaction('snags', 'readwrite');
    try {
      const store = tx.objectStore('snags');
      const snagNumber = await getNextSnagNumber(tx, snag.projectName);
      
      const newSnag = {
        ...snag,
        id,
        name,
        snagNumber,
        priority: snag.priority || 'Medium',
        assignedTo: snag.assignedTo || '',
        status: snag.status || 'In Progress',
        location: snag.location || '',
        annotations: [],
        createdAt: now,
        updatedAt: now,
      };

      await store.add(newSnag);
      await tx.done;
      return id;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error adding snag:', error);
    throw error;
  }
}

export async function getSnag(id: string) {
  const db = await getDB();
  const snag = await db.get('snags', id);
  console.log('Retrieved snag:', { id, snag });
  return snag;
}

export async function updateSnag(id: string, snag: Partial<Omit<SnagListDB['snags']['value'], 'id' | 'createdAt' | 'annotations'>>) {
  const db = await getDB();
  const existingSnag = await getSnag(id);
  
  if (!existingSnag) {
    throw new Error('Snag not found');
  }

  // If description is updated, regenerate the name unless it was manually edited
  let name = existingSnag.name;
  if (snag.description && snag.description !== existingSnag.description && !snag.name) {
    name = await generateAIName(snag.description);
  } else if (snag.name) {
    name = snag.name; // Use manually edited name if provided
  }
  
  await db.put('snags', {
    ...existingSnag,
    ...snag,
    name,
    updatedAt: new Date(),
  });
}

export async function deleteSnag(id: string) {
  const db = await getDB();
  await db.delete('snags', id);
}

export async function getAllSnags() {
  const db = await getDB();
  return await db.getAll('snags');
}

export async function getSnagsByProject(projectName: string) {
  const db = await getDB();
  const index = db.transaction('snags').store.index('by-project');
  const snags = await index.getAll(projectName);
  console.log('Retrieved snags for project:', { projectName, snags });
  return snags;
}

// New annotation functions that work with the embedded annotations
export async function addAnnotationToSnag(snagId: string, annotation: Omit<Annotation, 'id'>) {
  const db = await getDB();
  const snag = await getSnag(snagId);
  
  if (!snag) {
    throw new Error('Snag not found');
  }

  const newAnnotation: Annotation = {
    ...annotation,
    id: crypto.randomUUID()
  };
  
  await db.put('snags', {
    ...snag,
    annotations: [...(snag.annotations || []), newAnnotation],
    updatedAt: new Date()
  });

  return newAnnotation;
}

export async function updateSnagAnnotations(snagId: string, annotations: Annotation[]): Promise<SnagListDB['snags']['value']> {
  const db = await getDB();
  const snag = await getSnag(snagId);
  
  if (!snag) {
    throw new Error('Snag not found');
  }
  
  // Ensure annotations is a valid array and each annotation has required fields
  const validAnnotations = Array.isArray(annotations) ? annotations.map(ann => ({
    id: ann.id || crypto.randomUUID(),
    x: ann.x,
    y: ann.y,
    text: ann.text || '',
    size: ann.size
  })) : [];

  console.log('Processing annotations for update:', {
    snagId,
    currentAnnotations: snag.annotations || [],
    newAnnotations: validAnnotations
  });

  const updatedSnag = {
    ...snag,
    annotations: validAnnotations,
    updatedAt: new Date()
  };

  console.log('Saving updated snag:', updatedSnag);
  await db.put('snags', updatedSnag);
  
  // Verify the update and return the snag directly
  const verifiedSnag = await getSnag(snagId);
  if (!verifiedSnag) {
    throw new Error('Failed to verify snag update');
  }
  console.log('Verified snag after update:', verifiedSnag);
  
  return verifiedSnag;
}

// Helper function to generate unique project name
async function generateUniqueProjectName(db: IDBPDatabase<SnagListDB>, baseName: string): Promise<string> {
  const index = db.transaction('projects').store.index('by-name');
  let currentName = baseName;
  let counter = 1;
  
  while (await index.get(currentName)) {
    currentName = `${baseName} (${counter})`;
    counter++;
  }
  
  return currentName;
}

// Project CRUD operations
export async function addProject(name: string) {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = new Date();
  
  // Generate a unique name if the provided name already exists
  const uniqueName = await generateUniqueProjectName(db, name);
  
  await db.add('projects', {
    id,
    name: uniqueName,
    createdAt: now,
    updatedAt: now,
  });
  
  return { id, name: uniqueName };
}

export async function getProject(id: string) {
  const db = await getDB();
  return await db.get('projects', id);
}

export async function getProjectByName(name: string) {
  const db = await getDB();
  const index = db.transaction('projects').store.index('by-name');
  return await index.get(name);
}

export async function getAllProjects() {
  const db = await getDB();
  return await db.getAll('projects');
}

export async function deleteProject(id: string) {
  const db = await getDB();
  
  // Get project name first
  const project = await getProject(id);
  if (!project) return;
  
  // Delete all snags in the project
  const snags = await getSnagsByProject(project.name);
  for (const snag of snags) {
    await deleteSnag(snag.id);
  }
  
  // Delete the project
  await db.delete('projects', id);
}

// Add new functions for voice recordings
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

export async function updateVoiceRecordingTranscription(id: string, transcription: string) {
  const db = await getDB();
  const recording = await getVoiceRecording(id);
  
  if (!recording) {
    throw new Error('Voice recording not found');
  }
  
  await db.put('voiceRecordings', {
    ...recording,
    transcription,
    processed: true,
  });
} 