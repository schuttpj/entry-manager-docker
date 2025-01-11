import { useState, useEffect, useRef } from 'react';
import { getSnagsByProject, deleteSnag, updateSnag, updateSnagAnnotations, getSnag } from '@/lib/db';
import { Trash2, Save, X, Search, SortDesc, Maximize2, MessageSquare, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Annotation, Snag } from '@/types/snag';
import ImageAnnotator from './ImageAnnotator';
import { SnagListItem } from './SnagListItem';
import { PDFExport } from './PDFExport';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface EditState {
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'In Progress' | 'Completed';
  name: string;
}

interface SnagListProps {
  projectName: string;
  refreshTrigger?: number;
  isDarkMode?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'priority' | 'status';

export function SnagList({ projectName, refreshTrigger = 0, isDarkMode = false }: SnagListProps) {
  const [snags, setSnags] = useState<Snag[]>([]);
  const [filteredSnags, setFilteredSnags] = useState<Snag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSnags, setSelectedSnags] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<EditState>({
    description: '',
    priority: 'Medium',
    assignedTo: '',
    status: 'In Progress',
    name: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [annotatingSnag, setAnnotatingSnag] = useState<Snag | null>(null);
  const imageRefs = useRef<{ [key: string]: HTMLImageElement }>({});
  const [error, setError] = useState<string | null>(null);
  const [completionDateDialogOpen, setCompletionDateDialogOpen] = useState(false);
  const [completionDate, setCompletionDate] = useState<string>('');
  const [snagToComplete, setSnagToComplete] = useState<Snag | null>(null);

  // Add this function to calculate actual position
  const calculatePinPosition = (annotation: Annotation, image: HTMLImageElement) => {
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const containerWidth = image.width;
    const containerHeight = image.height;

    // Calculate scaling ratios
    const imageRatio = imageWidth / imageHeight;
    const containerRatio = containerWidth / containerHeight;

    let actualWidth, actualHeight, offsetX = 0, offsetY = 0;

    if (imageRatio > containerRatio) {
      // Image is wider than container ratio - black bars on top and bottom
      actualWidth = containerWidth;
      actualHeight = containerWidth / imageRatio;
      offsetY = (containerHeight - actualHeight) / 2;
    } else {
      // Image is taller than container ratio - black bars on sides
      actualHeight = containerHeight;
      actualWidth = containerHeight * imageRatio;
      offsetX = (containerWidth - actualWidth) / 2;
    }

    // Calculate actual pixel positions
    const x = (annotation.x / 100 * actualWidth) + offsetX;
    const y = (annotation.y / 100 * actualHeight) + offsetY;

    // Convert back to percentages relative to container
    return {
      x: (x / containerWidth) * 100,
      y: (y / containerHeight) * 100
    };
  };

  // Load snags
  useEffect(() => {
    const loadSnags = async () => {
      if (!projectName) {
        setSnags([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const loadedSnags = await getSnagsByProject(projectName);
        console.log('Loaded snags with annotations:', loadedSnags);
        const snagWithAnnotations = loadedSnags.map(snag => ({
          ...snag,
          annotations: snag.annotations || []
        }));
        setSnags(snagWithAnnotations);
      } catch (error) {
        console.error('Failed to load snags:', error);
        setError('Failed to load snags. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadSnags();
  }, [projectName, refreshTrigger]);

  // Filter and sort snags
  useEffect(() => {
    let filtered = [...snags];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(snag => 
        snag.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snag.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snag.priority.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snag.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snag.annotations?.some(annotation => 
          annotation.text.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'priority':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'status':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredSnags(filtered);
  }, [snags, searchTerm, sortBy]);

  const handleDelete = async (id: string) => {
    // Optimistically remove the snag
    const snagToDelete = snags.find(s => s.id === id);
    setSnags(snags.filter(snag => snag.id !== id));
    setDeleteConfirmId(null);

    try {
      await deleteSnag(id);
    } catch (error) {
      console.error('Failed to delete snag:', error);
      // Revert the optimistic update
      if (snagToDelete) {
        setSnags(prev => [...prev, snagToDelete]);
      }
      setError('Failed to delete snag. Please try again.');
    }
  };

  const startEditing = (snag: Snag) => {
    setEditingId(snag.id);
    setEditState({
      description: snag.description,
      priority: snag.priority,
      assignedTo: snag.assignedTo,
      status: snag.status,
      name: snag.name
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({
      description: '',
      priority: 'Medium',
      assignedTo: '',
      status: 'In Progress',
      name: ''
    });
  };

  const saveChanges = async (snag: Snag) => {
    // Store the original snag state
    const originalSnag = { ...snag };
    
    // Optimistically update the UI
    setSnags(snags.map(s => 
      s.id === snag.id 
        ? { ...s, ...editState, updatedAt: new Date() } 
        : s
    ));
    setEditingId(null);

    try {
      await updateSnag(snag.id, editState);
    } catch (error) {
      console.error('Failed to update snag:', error);
      // Revert the optimistic update
      setSnags(snags.map(s => 
        s.id === snag.id ? originalSnag : s
      ));
      setError('Failed to save changes. Please try again.');
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) {
        if (e.key === 'Escape') {
          cancelEditing();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          const snag = snags.find(s => s.id === editingId);
          if (snag) saveChanges(snag);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, snags]);

  const handleAnnotationSave = async (annotations: Annotation[] | unknown) => {
    if (!annotatingSnag) return;

    try {
      // Handle both array and object with annotations property
      let annotationsArray: unknown;
      if (Array.isArray(annotations)) {
        annotationsArray = annotations;
      } else if (annotations && typeof annotations === 'object' && 'annotations' in annotations) {
        annotationsArray = (annotations as { annotations: unknown }).annotations;
      } else {
        console.error('Invalid annotations format:', annotations);
        throw new Error('Invalid annotations format');
      }

      if (!Array.isArray(annotationsArray)) {
        console.error('Annotations is not an array:', annotationsArray);
        throw new Error('Annotations must be an array');
      }

      // Ensure annotations are properly formatted
      const formattedAnnotations = annotationsArray.map(ann => {
        if (!ann || typeof ann !== 'object') {
          throw new Error('Invalid annotation object');
        }
        
        return {
          id: String(ann.id || crypto.randomUUID()),
          x: typeof ann.x === 'number' ? ann.x : 0,
          y: typeof ann.y === 'number' ? ann.y : 0,
          text: String(ann.text || ''),
          size: typeof ann.size === 'number' ? ann.size : 24
        };
      });

      console.log('Saving annotations:', formattedAnnotations, 'for snag:', annotatingSnag.id);
      const updatedSnag = await updateSnagAnnotations(annotatingSnag.id, formattedAnnotations);
      console.log('Snag after update:', updatedSnag);
      
      if (updatedSnag) {
        // Ensure we have the annotations array, even if empty
        const updatedAnnotations = Array.isArray(updatedSnag.annotations) ? updatedSnag.annotations : [];
        
        setSnags(snags.map(snag => 
          snag.id === annotatingSnag.id 
            ? { ...snag, annotations: updatedAnnotations } 
            : snag
        ));
        
        setAnnotatingSnag(null);
      }
    } catch (error) {
      console.error('Failed to update annotations:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleToggleSelect = (snag: Snag) => {
    setSelectedSnags(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(snag.id)) {
        newSelected.delete(snag.id);
      } else {
        newSelected.add(snag.id);
      }
      return newSelected;
    });
  };

  const handleViewAnnotations = (snag: Snag) => {
    setAnnotatingSnag(snag);
  };

  const handleStatusChange = (value: 'In Progress' | 'Completed') => {
    if (value === 'Completed') {
      setSnagToComplete(snags.find(s => s.id === editingId) || null);
      setCompletionDateDialogOpen(true);
    } else {
      setEditState(prev => ({
        ...prev,
        status: value,
        completionDate: null
      }));
    }
  };

  const handleCompletionDateSubmit = () => {
    if (!completionDate) {
      setCompletionDateDialogOpen(false);
      return;
    }

    setEditState(prev => ({
      ...prev,
      status: 'Completed',
      completionDate: new Date(completionDate)
    }));
    setCompletionDateDialogOpen(false);
    setCompletionDate('');
  };

  if (loading) {
    return (
      <div className={`rounded-lg shadow transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className={`text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Snag List</h2>
        </div>
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Loading snags...
        </div>
      </div>
    );
  }

  if (!projectName) {
    return (
      <div className={`rounded-lg shadow transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className={`text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Snag List</h2>
        </div>
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Select a project to view snags
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      {/* Header with search and sort */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          {/* Left Section */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className={`text-xl font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Snag List</h2>
            {filteredSnags.length > 0 && (
              <div
                className="flex items-center gap-2 h-9 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
                onClick={() => {
                  const allSelected = filteredSnags.length === selectedSnags.size;
                  if (allSelected) {
                    setSelectedSnags(new Set());
                  } else {
                    setSelectedSnags(new Set(filteredSnags.map(snag => snag.id)));
                  }
                }}
              >
                <Checkbox 
                  checked={filteredSnags.length > 0 && filteredSnags.length === selectedSnags.size}
                  className="h-4 w-4 border-2"
                />
                <span className="text-sm">Select All</span>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search descriptions..."
                className={`w-full sm:w-64 pl-9 h-9 transition-all duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:ring-gray-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-gray-400'
                }`}
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(value: SortOption) => setSortBy(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <PDFExport 
              snags={filteredSnags.filter(snag => selectedSnags.has(snag.id))} 
              projectName={projectName} 
            />
          </div>
        </div>
      </div>

      {/* Snag List */}
      {filteredSnags.length === 0 ? (
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {searchTerm ? 'No snags match your search.' : 'No snags added yet. Upload photos to get started.'}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredSnags.map((snag) => (
            <div key={snag.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
              {editingId === snag.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editState.name}
                        onChange={(e) => setEditState(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={editState.description}
                        onChange={(e) => setEditState(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="assignedTo">Assigned To</Label>
                      <Input
                        id="assignedTo"
                        value={editState.assignedTo}
                        onChange={(e) => setEditState(prev => ({ ...prev, assignedTo: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={editState.priority}
                        onValueChange={(value) => setEditState(prev => ({ ...prev, priority: value as 'Low' | 'Medium' | 'High' }))}
                      >
                        <SelectTrigger id="priority" className="mt-1">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editState.status}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger id="status" className="mt-1">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button onClick={() => saveChanges(snag)}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <SnagListItem
                  snag={snag}
                  onEdit={startEditing}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onViewAnnotations={handleViewAnnotations}
                  isSelected={selectedSnags.has(snag.id)}
                  onToggleSelect={handleToggleSelect}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md mx-4 space-y-4 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Delete Snag</h3>
            <p className={`transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Are you sure you want to delete this snag? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
              >
                Delete Snag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Zoomed snag"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Annotation Modal */}
      {annotatingSnag && (
        <ImageAnnotator
          imageUrl={annotatingSnag.photoPath}
          existingAnnotations={annotatingSnag.annotations}
          onSave={handleAnnotationSave}
          onClose={() => setAnnotatingSnag(null)}
        />
      )}

      {error && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          isDarkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Completion Date Dialog */}
      <Dialog open={completionDateDialogOpen} onOpenChange={setCompletionDateDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border-0 shadow-lg sm:max-w-[425px]">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Set Completion Date</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Please enter the completion date for this snag.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="completionDate" className="min-w-[80px] text-gray-700 dark:text-gray-300">
                Date
              </Label>
              <Input
                id="completionDate"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="flex-1 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="pt-4 border-t flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setCompletionDateDialogOpen(false);
                setEditState(prev => ({ ...prev, status: 'In Progress' }));
              }}
              className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCompletionDateSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 