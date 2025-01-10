export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  size?: number;
}

export interface Snag {
  id: string;
  projectName: string;
  snagNumber: number;
  description: string;
  photoPath: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'Open' | 'In Progress' | 'Completed';
  createdAt: string | Date;
  updatedAt: string | Date;
  annotations: Annotation[];
} 