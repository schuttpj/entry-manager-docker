import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
      status: 'Open' | 'Closed';
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-project': string; 'by-date': Date };
  };
  annotations: {
    key: string;
    value: {
      id: string;
      snagId: string;
      data: string;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-snag': string };
  };
}

const DB_NAME = 'snag-list-db';
const DB_VERSION = 3;

export async function initDB(): Promise<IDBPDatabase<SnagListDB>> {
  const db = await openDB<SnagListDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // Create projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', {
          keyPath: 'id',
        });
        projectStore.createIndex('by-name', 'name', { unique: true });
      }

      // Create or update snags store
      if (!db.objectStoreNames.contains('snags')) {
        const snagStore = db.createObjectStore('snags', {
          keyPath: 'id',
        });
        snagStore.createIndex('by-project', 'projectName');
        snagStore.createIndex('by-date', 'createdAt');
      }

      // Create or update annotations store
      if (!db.objectStoreNames.contains('annotations')) {
        const annotationStore = db.createObjectStore('annotations', {
          keyPath: 'id',
        });
        annotationStore.createIndex('by-snag', 'snagId');
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
export async function addSnag(snag: Omit<SnagListDB['snags']['value'], 'id' | 'createdAt' | 'updatedAt' | 'snagNumber'>) {
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
    createdAt: now,
    updatedAt: now,
  });
  
  return id;
}

export async function getSnag(id: string) {
  const db = await getDB();
  return await db.get('snags', id);
}

export async function updateSnag(id: string, snag: Partial<SnagListDB['snags']['value']>) {
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
  
  // Also delete associated annotations
  const annotationsToDelete = await getAnnotationsBySnag(id);
  for (const annotation of annotationsToDelete) {
    await deleteAnnotation(annotation.id);
  }
}

export async function getAllSnags() {
  const db = await getDB();
  return await db.getAll('snags');
}

export async function getSnagsByProject(projectName: string) {
  const db = await getDB();
  const index = db.transaction('snags').store.index('by-project');
  return await index.getAll(projectName);
}

// Annotation CRUD operations
export async function addAnnotation(annotation: { snagId: string; data: string }) {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = new Date();
  
  await db.add('annotations', {
    ...annotation,
    id,
    createdAt: now,
    updatedAt: now,
  });
  
  return id;
}

export async function getAnnotation(id: string) {
  const db = await getDB();
  return await db.get('annotations', id);
}

export async function getAnnotationsBySnag(snagId: string) {
  const db = await getDB();
  const index = db.transaction('annotations').store.index('by-snag');
  return await index.getAll(snagId);
}

export async function updateAnnotation(id: string, data: string) {
  const db = await getDB();
  const existingAnnotation = await getAnnotation(id);
  
  if (!existingAnnotation) {
    throw new Error('Annotation not found');
  }
  
  await db.put('annotations', {
    ...existingAnnotation,
    data,
    updatedAt: new Date(),
  });
}

export async function deleteAnnotation(id: string) {
  const db = await getDB();
  await db.delete('annotations', id);
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