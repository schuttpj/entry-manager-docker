import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Annotation } from '../types/snag';

interface SnagListDB extends DBSchema {
  projects: {
    key: string;
    value: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-name': string };
  };
  snags: {
    key: string;
    value: {
      id: string;
      projectName: string;
      snagNumber: number;
      description: string;
      photoPath: string;
      priority: 'Low' | 'Medium' | 'High';
      assignedTo: string;
      status: 'Open' | 'In Progress' | 'Completed';
      createdAt: Date;
      updatedAt: Date;
      annotations: Annotation[];
    };
    indexes: { 'by-project': string; 'by-date': Date };
  };
}

interface SnagUpdate {
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  status?: 'Open' | 'In Progress' | 'Completed';
}

const DB_NAME = 'snag-list-db';
const DB_VERSION = 4;

export async function initDB(): Promise<IDBPDatabase<SnagListDB>> {
  const db = await openDB<SnagListDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // Create projects store if it doesn't exist
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', {
          keyPath: 'id',
        });
        projectStore.createIndex('by-name', 'name', { unique: true });
      }

      // Create or update snags store
      let snagStore;
      if (!db.objectStoreNames.contains('snags')) {
        snagStore = db.createObjectStore('snags', {
          keyPath: 'id',
        });
        snagStore.createIndex('by-project', 'projectName');
        snagStore.createIndex('by-date', 'createdAt');
      } else {
        snagStore = db.transaction('snags', 'readwrite').store;
      }

      // Add annotations array to existing snags if upgrading from version < 4
      if (oldVersion < 4) {
        snagStore.openCursor().then(function addAnnotations(cursor): Promise<void> | void {
          if (!cursor) return;
          
          const snag = cursor.value;
          if (!snag.annotations) {
            snag.annotations = [];
            cursor.update(snag);
          }
          
          return cursor.continue().then(addAnnotations);
        });
      }
    },
  });
  return db;
}

export async function getDB(): Promise<IDBPDatabase<SnagListDB>> {
  return await initDB();
}

// Helper function to get the next snag number for a project
async function getNextSnagNumber(projectName: string): Promise<number> {
  const db = await getDB();
  const snags = await getSnagsByProject(projectName);
  const numbers = snags.map(snag => snag.snagNumber || 0);
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

// Snag CRUD operations
export async function addSnag(snag: Omit<SnagListDB['snags']['value'], 'id' | 'createdAt' | 'updatedAt' | 'snagNumber' | 'annotations'>) {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = new Date();
  const snagNumber = await getNextSnagNumber(snag.projectName);
  
  await db.add('snags', {
    ...snag,
    id,
    snagNumber,
    priority: snag.priority || 'Medium',
    assignedTo: snag.assignedTo || '',
    status: snag.status || 'Open',
    annotations: [],
    createdAt: now,
    updatedAt: now,
  });
  
  return id;
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
  
  await db.put('snags', {
    ...existingSnag,
    ...snag,
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

// Project CRUD operations
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
  
  return id;
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