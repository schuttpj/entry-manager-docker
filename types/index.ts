export interface Snag {
  id: string;
  snagNumber: number;
  photoPath: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Completed';
  assignedTo?: string;
  annotations: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
} 