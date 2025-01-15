import { useState, useEffect, useRef, useCallback } from 'react';
import { getSnagsByProject, deleteSnag, updateSnag, updateSnagAnnotations, createBackup, downloadBackupFile, restoreFromBackup } from '@/lib/db';
import { Trash2, Save, X, Search, SortDesc, Maximize2, MessageSquare, AlertCircle, Calendar, Grid, List, Database, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Annotation, Snag } from '@/types/snag';
import ImageAnnotator from './ImageAnnotator';
import { SnagListItem } from './SnagListItem';
import { PDFExport } from './PDFExport';
import PDFExportList from './PDFExportList';
import { Checkbox } from "@/components/ui/checkbox";
import { GridView } from './GridView';
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface EditState {
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'In Progress' | 'Completed';
  name: string;
  location: string;
  observationDate: string;
  completionDate: Date | null;
}

interface SnagListProps {
  projectName: string;
  refreshTrigger?: number;
  isDarkMode?: boolean;
  handleUploadComplete: () => void;
}

type SortOption = 'newest' | 'oldest' | 'priority' | 'status' | 'entry-asc' | 'entry-desc';

const BACKUP_REMINDER_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_BACKUP_KEY = 'lastBackupTime';

export function SnagList({ projectName, refreshTrigger = 0, isDarkMode = false, handleUploadComplete }: SnagListProps) {
  const [snags, setSnags] = useState<Snag[]>([]);
  const [filteredSnags, setFilteredSnags] = useState<Snag[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSnags, setSelectedSnags] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isGridViewOpen, setIsGridViewOpen] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    description: '',
    priority: 'Medium',
    assignedTo: '',
    status: 'In Progress',
    name: '',
    location: '',
    observationDate: format(new Date(), 'yyyy-MM-dd'),
    completionDate: null
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
        console.log('🔄 Auto-refreshing snag list...');
        const loadedSnags = await getSnagsByProject(projectName);
        console.log('📋 Loaded snags:', loadedSnags.length);
        const snagWithAnnotations = loadedSnags.map(snag => ({
          ...snag,
          annotations: snag.annotations || []
        }));
        setSnags(snagWithAnnotations);
      } catch (error) {
        console.error('❌ Failed to load snags:', error);
        setError('Failed to load entries. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadSnags();
  }, [projectName, refreshTrigger, lastUpdate]);

  // Function to trigger refresh
  const refreshList = () => {
    console.log('🔄 Manual refresh triggered');
    setLastUpdate(Date.now());
  };

  // Filter and sort snags
  useEffect(() => {
    let filtered = [...snags];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(snag => 
        (snag.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (snag.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (snag.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (snag.priority || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (snag.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (snag.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        snag.annotations?.some(annotation => 
          (annotation.text || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          if (a.status === b.status) return 0;
          return a.status === 'Completed' ? 1 : -1;
        case 'entry-asc':
          return a.snagNumber - b.snagNumber;
        case 'entry-desc':
          return b.snagNumber - a.snagNumber;
        default:
          return 0;
      }
    });

    setFilteredSnags(filtered);
  }, [snags, searchTerm, sortBy]);

  const handleDelete = async (id: string) => {
    console.log('🗑️ Starting deletion process in SnagList for snag:', id);
    
    const snagToDelete = snags.find(s => s.id === id);
    console.log('📋 Snag to be deleted:', {
      id: snagToDelete?.id,
      name: snagToDelete?.name,
      projectName: snagToDelete?.projectName,
      snagNumber: snagToDelete?.snagNumber
    });
    
    setSnags(snags.filter(snag => snag.id !== id));
    setDeleteConfirmId(null);

    try {
      console.log('💾 Calling database delete operation...');
      await deleteSnag(id);
      console.log('✅ Snag successfully deleted from database');
      
      // Trigger auto-refresh after deletion
      refreshList();
    } catch (error) {
      console.error('❌ Failed to delete snag:', error);
      if (snagToDelete) {
        console.log('⚠️ Reverting optimistic update...');
        setSnags(prev => [...prev, snagToDelete]);
      }
      setError('Failed to delete entry. Please try again.');
    }
  };

  const startEditing = (snag: Snag) => {
    setEditingId(snag.id);
    setEditState({
      description: snag.description || '',
      priority: snag.priority,
      assignedTo: snag.assignedTo || '',
      status: snag.status,
      name: snag.name || '',
      location: snag.location || '',
      observationDate: snag.observationDate ? format(new Date(snag.observationDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      completionDate: snag.completionDate ? new Date(snag.completionDate) : null
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({
      description: '',
      priority: 'Medium',
      assignedTo: '',
      status: 'In Progress',
      name: '',
      location: '',
      observationDate: format(new Date(), 'yyyy-MM-dd'),
      completionDate: null
    });
  };

  const saveChanges = async (snag: Snag) => {
    const originalSnag = { ...snag };
    const observationDate = new Date(editState.observationDate);
    
    setSnags(snags.map(s => 
      s.id === snag.id 
        ? { 
            ...s, 
            ...editState, 
            observationDate: observationDate,
            completionDate: editState.status === 'Completed' ? editState.completionDate : null,
            updatedAt: new Date() 
          } 
        : s
    ));
    setEditingId(null);

    try {
      const updateData = {
        description: editState.description,
        priority: editState.priority,
        assignedTo: editState.assignedTo,
        status: editState.status,
        name: editState.name,
        location: editState.location,
        observationDate: observationDate,
        completionDate: editState.status === 'Completed' ? editState.completionDate : null
      };

      await updateSnag(snag.id, updateData);
      // Trigger auto-refresh after update
      refreshList();
    } catch (error) {
      console.error('Failed to update snag:', error);
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

  const triggerConfetti = () => {
    // Create a simple confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.6 }
    });

    // Create another burst after a small delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: 0.5, y: 0.6 }
      });
    }, 250);

    // Show the celebratory toast message after a slight delay
    setTimeout(() => {
      toast('Well done! 🎉', {
        description: 'You like to get things done! Well done on closing out an entry!',
        duration: 5000,
        position: 'top-center',
        className: `${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border-2 border-green-500`,
      });
    }, 600);
  };

  const handleCompletionDateSubmit = () => {
    if (!completionDate) {
      setCompletionDateDialogOpen(false);
      return;
    }

    const date = new Date(completionDate);
    if (isNaN(date.getTime())) {
      console.error('Invalid completion date');
      return;
    }

    setEditState(prev => ({
      ...prev,
      status: 'Completed',
      completionDate: date
    }));
    setCompletionDateDialogOpen(false);
    setCompletionDate('');
    triggerConfetti(); // Trigger the confetti effect
  };

  const handleBackupClick = useCallback(async () => {
    const shouldBackup = await new Promise<boolean>((resolve) => {
      toast.custom((t) => (
        <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-lg">
          <p className="text-sm">Create backup?</p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                toast.dismiss(t);
                resolve(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                toast.dismiss(t);
                resolve(true);
              }}
            >
              Backup
            </Button>
          </div>
        </div>
      ));
    });

    if (!shouldBackup) return;

    try {
      setLoading(true);
      const backup = await createBackup();
      downloadBackupFile(backup);
      localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
      toast.success('Backup created successfully!');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add backup reminder check
  useEffect(() => {
    const checkBackupReminder = () => {
      const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
      const now = Date.now();
      
      if (!lastBackup || (now - Number(lastBackup)) > BACKUP_REMINDER_INTERVAL) {
        const minutesPassed = lastBackup ? Math.floor((now - Number(lastBackup)) / (60 * 1000)) : 0;
        const timeMessage = lastBackup 
          ? `It has been ${minutesPassed} minutes since your last backup.`
          : 'You haven\'t created a backup yet.';
          
        toast('Backup Reminder', {
          description: `${timeMessage} Consider backing up your data to prevent any loss.`,
          action: {
            label: 'Backup Now',
            onClick: handleBackupClick
          }
        });
      }
    };

    // Check on component mount and when project changes
    checkBackupReminder();

    // Also set up a periodic check
    const intervalId = setInterval(checkBackupReminder, BACKUP_REMINDER_INTERVAL);

    return () => clearInterval(intervalId);
  }, [projectName, handleBackupClick]);

  if (loading) {
    return (
      <div className={`rounded-lg shadow transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className={`text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Entry List</h2>
        </div>
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Loading entries...
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
          }`}>Entry List</h2>
        </div>
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Select a project to view entries
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="entry-asc">Entry # (Ascending)</SelectItem>
              <SelectItem value="entry-desc">Entry # (Descending)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackupClick}
              title="Backup Data"
              className="rounded-l-md rounded-r-none border-r"
            >
              <Database className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  
                  if (!window.confirm('Restoring will replace all current data. Are you sure you want to continue?')) {
                    return;
                  }

                  try {
                    const backupData = JSON.parse(await file.text());
                    await restoreFromBackup(backupData);
                    toast.success('Data restored successfully!');
                    refreshList();
                  } catch (error) {
                    console.error('Restore failed:', error);
                    toast.error('Failed to restore backup');
                  }
                };
                input.click();
              }}
              title="Restore from Backup"
              className="rounded-r-md rounded-l-none"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setViewMode('grid');
              setIsGridViewOpen(true);
            }}
            title="Grid View"
            className={viewMode === 'grid' ? 'bg-accent' : ''}
          >
            <Grid className="h-4 w-4" />
          </Button>

          {selectedSnags.size > 0 && (
            <>
              <PDFExport
                snags={snags.filter(snag => selectedSnags.has(snag.id))}
                projectName={projectName}
              />
              <PDFExportList
                snags={snags.filter(snag => selectedSnags.has(snag.id))}
                projectName={projectName}
                isDarkMode={isDarkMode}
                onClose={() => setSelectedSnags(new Set())}
                sortOrder={sortBy === 'oldest' ? 'asc' : 'desc'}
              />
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Loading entries...
        </div>
      ) : filteredSnags.length === 0 ? (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No entries found.
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {/* List View */}
          {filteredSnags.map((snag) => (
            <SnagListItem
              key={snag.id}
              snag={snag}
              isSelected={selectedSnags.has(snag.id)}
              onToggleSelect={() => handleToggleSelect(snag)}
              onEdit={() => startEditing(snag)}
              onDelete={() => setDeleteConfirmId(snag.id)}
              onViewAnnotations={() => handleViewAnnotations(snag)}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      ) : null}

      {/* Grid View */}
      <GridView
        snags={filteredSnags}
        isOpen={isGridViewOpen}
        onClose={() => {
          setIsGridViewOpen(false);
          setViewMode('list');
        }}
        isDarkMode={isDarkMode}
        onSnagUpdate={async (updatedSnag) => {
          try {
            const { id, projectName, ...snagData } = updatedSnag;
            const snagToUpdate = {
              ...snagData,
              updatedAt: new Date(updatedSnag.updatedAt),
              createdAt: new Date(updatedSnag.createdAt),
              observationDate: new Date(updatedSnag.observationDate),
              completionDate: updatedSnag.completionDate ? new Date(updatedSnag.completionDate) : undefined
            };
            await updateSnag(id, snagToUpdate);
            handleUploadComplete();
          } catch (error) {
            console.error('Failed to update snag:', error);
            toast.error('Failed to update entry');
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md mx-4 space-y-4 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Delete Entry</h3>
            <p className={`transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Are you sure you want to delete this entry? This action cannot be undone.
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
                Delete Entry
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
            alt="Zoomed entry"
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

      {/* Completion Date Dialog */}
      <Dialog open={completionDateDialogOpen} onOpenChange={setCompletionDateDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border-0 shadow-lg sm:max-w-[425px]">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Set Completion Date</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Please enter the completion date for this entry.
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

      {/* Edit Dialog */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 space-y-4 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Edit Entry</h3>
              <button
                onClick={cancelEditing}
                className={`rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
              >
                <X className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  Name
                </Label>
                <Input
                  id="name"
                  value={editState.name}
                  onChange={(e) => setEditState((prev) => ({ ...prev, name: e.target.value }))}
                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  Description
                </Label>
                <Input
                  id="description"
                  value={editState.description}
                  onChange={(e) => setEditState((prev) => ({ ...prev, description: e.target.value }))}
                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  Priority
                </Label>
                <Select
                  value={editState.priority}
                  onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                    setEditState((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger className={`w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  Status
                </Label>
                <Select
                  value={editState.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className={`w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  Location
                </Label>
                <Input
                  id="location"
                  value={editState.location}
                  onChange={(e) => setEditState((prev) => ({ ...prev, location: e.target.value }))}
                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observationDate" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  Observation Date
                </Label>
                <Input
                  id="observationDate"
                  type="date"
                  value={editState.observationDate}
                  onChange={(e) => setEditState((prev) => ({ ...prev, observationDate: e.target.value }))}
                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  Assigned To
                </Label>
                <Input
                  id="assignedTo"
                  value={editState.assignedTo}
                  onChange={(e) => setEditState((prev) => ({ ...prev, assignedTo: e.target.value }))}
                  className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const snag = snags.find((s) => s.id === editingId);
                  if (snag) saveChanges(snag);
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 