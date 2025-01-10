import { useState, useEffect, useRef } from 'react';
import { getSnagsByProject, deleteSnag, updateSnag, updateSnagAnnotations, getSnag } from '@/lib/db';
import { Trash2, Save, X, Search, SortDesc, Maximize2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Annotation } from '@/types/snag';
import ImageAnnotator from './ImageAnnotator';
import { SnagListItem } from './SnagListItem';
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

interface Snag {
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
}

interface EditState {
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'Open' | 'In Progress' | 'Completed';
}

interface SnagListProps {
  projectName: string;
  refreshTrigger?: number;
  isDarkMode?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'updated';

export function SnagList({ projectName, refreshTrigger = 0, isDarkMode = false }: SnagListProps) {
  const [snags, setSnags] = useState<Snag[]>([]);
  const [filteredSnags, setFilteredSnags] = useState<Snag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    description: '',
    priority: 'Medium',
    assignedTo: '',
    status: 'Open'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [annotatingSnag, setAnnotatingSnag] = useState<Snag | null>(null);
  const imageRefs = useRef<{ [key: string]: HTMLImageElement }>({});

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
        const loadedSnags = await getSnagsByProject(projectName);
        console.log('Loaded snags with annotations:', loadedSnags);
        // Ensure all snags have an annotations array
        const snagWithAnnotations = loadedSnags.map(snag => ({
          ...snag,
          annotations: snag.annotations || []
        }));
        setSnags(snagWithAnnotations);
      } catch (error) {
        console.error('Failed to load snags:', error);
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
        snag.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredSnags(filtered);
  }, [snags, searchTerm, sortBy]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSnag(id);
      setSnags(snags.filter(snag => snag.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete snag:', error);
    }
  };

  const startEditing = (snag: Snag) => {
    setEditingId(snag.id);
    setEditState({
      description: snag.description,
      priority: snag.priority,
      assignedTo: snag.assignedTo,
      status: snag.status
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({
      description: '',
      priority: 'Medium',
      assignedTo: '',
      status: 'Open'
    });
  };

  const saveChanges = async (snag: Snag) => {
    try {
      await updateSnag(snag.id, editState);
      setSnags(snags.map(s => 
        s.id === snag.id 
          ? { ...s, ...editState } 
          : s
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update snag:', error);
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
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className={`text-lg font-medium transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Snag List</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search descriptions..."
                className={`w-64 pl-9 pr-4 py-1.5 text-sm rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:ring-gray-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-gray-400'
                }`}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`text-sm py-1.5 px-3 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 focus:ring-gray-400'
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
            </select>
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
              <div className="flex items-start space-x-4">
                {/* Image section */}
                <div className="flex-shrink-0 w-48 h-48 relative">
                  <img
                    src={snag.photoPath}
                    alt={`Snag ${snag.snagNumber}`}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setZoomedImage(snag.photoPath)}
                    ref={el => { if (el) imageRefs.current[snag.id] = el; }}
                  />
                  {snag.annotations && snag.annotations.length > 0 && (
                    <button
                      onClick={() => setAnnotatingSnag(snag)}
                      className="absolute bottom-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    </button>
                  )}
                </div>

                {/* Content section */}
                <div className="flex-grow">
                  {editingId === snag.id ? (
                    // Editing mode
                    <div className="space-y-3">
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={editState.description}
                          onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <Label>Priority</Label>
                          <Select
                            value={editState.priority}
                            onValueChange={(value) => setEditState({ ...editState, priority: value as 'Low' | 'Medium' | 'High' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label>Status</Label>
                          <Select
                            value={editState.status}
                            onValueChange={(value) => setEditState({ ...editState, status: value as 'Open' | 'In Progress' | 'Completed' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Assigned To</Label>
                        <Input
                          value={editState.assignedTo}
                          onChange={(e) => setEditState({ ...editState, assignedTo: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveChanges(snag)}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">Snag #{snag.snagNumber}</h3>
                          <p className="mt-1 text-gray-600 dark:text-gray-300">{snag.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setAnnotatingSnag(snag)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                            title="Add/Edit Annotations"
                          >
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                          </button>
                          <button
                            onClick={() => startEditing(snag)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            <Save className="w-5 h-5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(snag.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500">Priority</Label>
                          <div className="mt-1 font-medium">{snag.priority}</div>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Status</Label>
                          <div className="mt-1 font-medium">{snag.status}</div>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Assigned To</Label>
                          <div className="mt-1 font-medium">{snag.assignedTo || 'Unassigned'}</div>
                        </div>
                      </div>
                      {/* Annotations List */}
                      {snag.annotations && snag.annotations.length > 0 && (
                        <div className="mt-4">
                          <Label className="text-sm text-gray-500">Annotations</Label>
                          <div className="mt-2 space-y-2">
                            {snag.annotations.map((annotation, index) => (
                              <div 
                                key={annotation.id} 
                                className="flex items-start space-x-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                              >
                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 text-sm">
                                  {index + 1}
                                </span>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {annotation.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 text-sm text-gray-500">
                        Created {format(new Date(snag.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
    </div>
  );
} 