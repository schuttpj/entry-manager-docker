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
  name: string;
  description: string;
  photoPath: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'In Progress' | 'Completed';
  location: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  completionDate: string | Date | null;
  annotations: Annotation[];
} 