"use client"

import { X, Grid, Info, Calendar, User, MapPin, AlertTriangle, MessageCircle, GripHorizontal, Pencil } from 'lucide-react';
import { Snag, Annotation } from '@/types/snag';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { updateSnagAnnotations } from '@/lib/db';

interface GridViewProps {
  snags: Snag[];
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  onSnagUpdate?: (updatedSnag: Snag) => void;
}

interface DetailsCardProps {
  snag: Snag;
  onClose: () => void;
  onEdit: (snag: Snag) => void;
  isDarkMode?: boolean;
  position: {
    x: number;
    y: number;
  };
}

interface AnnotationPinProps {
  number: number;
  x: number;
  y: number;
  text: string;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
  isDarkMode?: boolean;
}

interface EditState {
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'In Progress' | 'Completed';
  name: string;
  location: string;
}

function AnnotationPin({ number, x, y, text, isActive, onClick, isDarkMode }: AnnotationPinProps) {
  return (
    <div
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
        isActive ? "z-30 scale-125" : "z-20 hover:scale-110"
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <button
        onClick={onClick}
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
          isActive
            ? "bg-blue-500 text-white"
            : isDarkMode
            ? "bg-gray-800 text-white hover:bg-gray-700"
            : "bg-white text-gray-900 hover:bg-gray-100",
          "shadow-lg border-2",
          isActive ? "border-blue-300" : "border-gray-300"
        )}
      >
        {number + 1}
      </button>
    </div>
  );
}

function DetailsCard({ snag, onClose, onEdit, isDarkMode, position }: DetailsCardProps) {
  return (
    <div 
      className={`fixed z-70 w-80 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      } rounded-lg shadow-xl border ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      } transform transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {snag.name || 'Untitled Entry'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(snag);
              }}
              className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
            >
              <Pencil className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
            >
              <X className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Description */}
          <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p className="text-sm font-medium mb-1">Description</p>
            <p className="text-sm">{snag.description || 'No description provided'}</p>
          </div>

          {/* Status and Priority */}
          <div className="flex gap-3">
            <div className={`flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p className="text-xs font-medium mb-1">Status</p>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                snag.status === 'Completed' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {snag.status}
              </div>
            </div>
            <div className={`flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p className="text-xs font-medium mb-1">Priority</p>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                snag.priority === 'High'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : snag.priority === 'Medium'
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {snag.priority}
              </div>
            </div>
          </div>

          {/* Location and Assigned To */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <MapPin className="h-3 w-3" />
                <span>Location</span>
              </div>
              <p className="text-sm">{snag.location || 'Not specified'}</p>
            </div>
            <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <User className="h-3 w-3" />
                <span>Assigned To</span>
              </div>
              <p className="text-sm">{snag.assignedTo || 'Unassigned'}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <Calendar className="h-3 w-3" />
                <span>Created</span>
              </div>
              <p className="text-xs">{format(new Date(snag.createdAt), 'MMM d, yyyy')}</p>
            </div>
            {snag.completionDate && (
              <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex items-center gap-1 text-xs font-medium mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>Completed</span>
                </div>
                <p className="text-xs">{format(new Date(snag.completionDate), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GridView({ snags, isOpen, onClose, isDarkMode = false, onSnagUpdate }: GridViewProps) {
  // Add ref to track window state
  const isWindowOpenRef = useRef(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSnag, setSelectedSnag] = useState<Snag | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<{
    snag: Snag;
    position: { x: number; y: number };
  } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeAnnotationIndex, setActiveAnnotationIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingAnnotations, setIsEditingAnnotations] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<{ id: string; text: string } | null>(null);
  const [pinSize, setPinSize] = useState(24);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    description: '',
    priority: 'Medium',
    assignedTo: '',
    status: 'In Progress',
    name: '',
    location: ''
  });

  // Dragging state
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: window.innerWidth / 2 - 212, y: 100 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Update ref when window opens/closes
  useEffect(() => {
    isWindowOpenRef.current = isOpen;
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragRef.current?.contains(e.target as Node)) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dragPosition.x,
      y: e.clientY - dragPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    setDragPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleImageClick = async (e: React.MouseEvent) => {
    console.log('handleImageClick - Start', {
      isEditingAnnotations,
      selectedSnag,
      windowOpen: isWindowOpenRef.current
    });

    if (!isEditingAnnotations || !selectedSnag) {
      console.log('handleImageClick - Early return due to:', {
        isEditingAnnotations,
        hasSelectedSnag: !!selectedSnag
      });
      return;
    }
    
    // Set window state and processing flag
    isWindowOpenRef.current = true;
    setIsProcessingAction(true);
    console.log('Window state set to open, processing started');

    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    if (!(target instanceof HTMLImageElement)) {
      console.log('handleImageClick - Not an image element, returning');
      setIsProcessingAction(false);
      return;
    }

    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    console.log('handleImageClick - Calculated position:', { x, y });

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      x,
      y,
      text: '',
      size: pinSize
    };

    try {
      console.log('handleImageClick - Creating new annotation:', newAnnotation);
      
      // Create a complete copy of the current snag to work with
      const workingSnag = { ...selectedSnag };
      const updatedAnnotations = [...(workingSnag.annotations || []), newAnnotation];
      console.log('handleImageClick - Updated annotations array:', updatedAnnotations);

      // Update local state first
      setSelectedSnag(prev => {
        if (!prev) return workingSnag;
        return {
          ...prev,
          annotations: updatedAnnotations
        };
      });

      // Set editing state before database operation
      console.log('handleImageClick - Setting editing state');
      setEditingAnnotation({ id: newAnnotation.id, text: '' });
      setActiveAnnotationIndex(updatedAnnotations.length - 1);
      setIsEditingAnnotations(true);
      
      // Save to database in the background
      console.log('handleImageClick - Saving to database');
      const dbUpdatedSnag = await updateSnagAnnotations(selectedSnag.id, updatedAnnotations);
      console.log('handleImageClick - Database response:', dbUpdatedSnag);

      // Only proceed with further updates if the window is still open
      if (!isWindowOpenRef.current) {
        console.log('handleImageClick - Window closed during operation, returning');
        return;
      }

      // Create the final state update
      const finalSnag = {
        ...workingSnag,
        ...dbUpdatedSnag,
        annotations: updatedAnnotations,
        // Preserve critical fields
        photoPath: workingSnag.photoPath,
        projectName: workingSnag.projectName,
        description: workingSnag.description,
        completionDate: workingSnag.completionDate
      };

      console.log('handleImageClick - Setting final state:', finalSnag);
      setSelectedSnag(finalSnag);

      // Ensure editing state is maintained
      setIsEditingAnnotations(true);
      setSelectedImage(finalSnag.photoPath);
      
      // Only notify parent if window is still open
      if (isWindowOpenRef.current && onSnagUpdate) {
        console.log('handleImageClick - Updating parent component');
        onSnagUpdate(finalSnag);
      }
    } catch (error) {
      console.error('handleImageClick - Error:', error);
      toast.error('Failed to add annotation', {
        duration: 3000
      });
    } finally {
      // Clear processing flag after a small delay
      setTimeout(() => {
        setIsProcessingAction(false);
        console.log('Processing action completed');
      }, 100);
    }
  };

  const handleAnnotationSave = async () => {
    if (!selectedSnag || !editingAnnotation) return;

    try {
      const updatedAnnotations = selectedSnag.annotations.map(ann =>
        ann.id === editingAnnotation.id
          ? { ...ann, text: editingAnnotation.text }
          : ann
      );

      // Save annotations to database first
      const dbUpdatedSnag = await updateSnagAnnotations(selectedSnag.id, updatedAnnotations);
      
      // Ensure all required properties are included
      const updatedSnag = {
        ...dbUpdatedSnag,
        completionDate: selectedSnag.completionDate
      };
      
      // Update local state
      setSelectedSnag(updatedSnag);
      setEditingAnnotation(null);

      // Notify parent component
      if (onSnagUpdate) {
        onSnagUpdate(updatedSnag);
      }
    } catch (error) {
      console.error('Failed to save annotation:', error);
      toast.error('Failed to save annotation', {
        duration: 3000
      });
    }
  };

  const handleAnnotationDelete = async (annotationId: string) => {
    console.log('handleAnnotationDelete - Start', {
      annotationId,
      selectedSnag,
      windowOpen: isWindowOpenRef.current
    });

    if (!selectedSnag) {
      console.log('handleAnnotationDelete - No selected snag, returning');
      return;
    }

    // Set window state
    isWindowOpenRef.current = true;
    console.log('Window state set to open');

    // Set processing flag immediately
    setIsProcessingAction(true);
    console.log('Processing action started');

    try {
      console.log('handleAnnotationDelete - Maintaining window state');
      setSelectedImage(selectedSnag.photoPath);
      setIsEditingAnnotations(true);

      const updatedAnnotations = selectedSnag.annotations.filter(ann => ann.id !== annotationId);
      console.log('handleAnnotationDelete - Filtered annotations:', updatedAnnotations);
      
      const updatedSnag = {
        ...selectedSnag,
        annotations: updatedAnnotations,
        photoPath: selectedSnag.photoPath,
        projectName: selectedSnag.projectName,
        description: selectedSnag.description,
      };

      console.log('handleAnnotationDelete - Setting local state:', updatedSnag);
      setSelectedSnag(updatedSnag);
      
      console.log('handleAnnotationDelete - Saving to database');
      const dbUpdatedSnag = await updateSnagAnnotations(selectedSnag.id, updatedAnnotations);
      console.log('handleAnnotationDelete - Database response:', dbUpdatedSnag);
      
      if (!isWindowOpenRef.current) {
        console.log('handleAnnotationDelete - Window closed during operation, returning');
        return;
      }

      const finalSnag = {
        ...selectedSnag,
        ...dbUpdatedSnag,
        annotations: updatedAnnotations,
        photoPath: selectedSnag.photoPath,
        projectName: selectedSnag.projectName,
        description: selectedSnag.description,
        completionDate: selectedSnag.completionDate
      };

      console.log('handleAnnotationDelete - Setting final state:', finalSnag);
      setSelectedSnag(finalSnag);
      
      console.log('handleAnnotationDelete - Maintaining window state');
      setIsEditingAnnotations(true);
      setSelectedImage(finalSnag.photoPath);
      
      if (isWindowOpenRef.current && onSnagUpdate) {
        console.log('handleAnnotationDelete - Updating parent component');
        onSnagUpdate(finalSnag);
      }
    } catch (error) {
      console.error('handleAnnotationDelete - Error:', error);
      toast.error('Failed to delete annotation', {
        duration: 3000
      });
    } finally {
      console.log('handleAnnotationDelete - Cleanup');
      setTimeout(() => {
        setIsProcessingAction(false);
        console.log('Processing action completed');
      }, 100);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent, snag: Snag) => {
    e.stopPropagation();
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Position the card above the button
    const position = {
      x: Math.min(rect.left - 320 + rect.width, window.innerWidth - 340), // Ensure it doesn't go off-screen
      y: rect.top + rect.height + 10
    };
    
    setSelectedDetails({ snag, position });
  };

  const handleEdit = (snag: Snag) => {
    setEditingId(snag.id);
    setEditState({
      description: snag.description || '',
      priority: snag.priority,
      assignedTo: snag.assignedTo || '',
      status: snag.status,
      name: snag.name || '',
      location: snag.location || ''
    });
    setSelectedDetails(null); // Close the details card
  };

  // Add a cleanup effect to prevent unwanted window closing
  useEffect(() => {
    if (selectedImage && selectedSnag) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (editingAnnotation || isEditingAnnotations) {
          e.preventDefault();
          e.returnValue = '';
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [selectedImage, selectedSnag, editingAnnotation, isEditingAnnotations]);

  // Prevent state updates during processing
  const preventStateUpdate = useCallback(() => {
    return isProcessingAction;
  }, [isProcessingAction]);

  const handleCloseClick = (e: React.MouseEvent) => {
    console.log('handleCloseClick - Start', {
      isEditingAnnotations,
      editingAnnotation,
      windowOpen: isWindowOpenRef.current
    });

    e.preventDefault();
    e.stopPropagation();
    
    if (isEditingAnnotations || editingAnnotation) {
      console.log('handleCloseClick - Showing confirmation dialog');
      const shouldClose = window.confirm('Are you sure you want to close? Any unsaved changes will be lost.');
      if (!shouldClose) {
        console.log('handleCloseClick - User cancelled close');
        return;
      }
    }
    
    console.log('handleCloseClick - Updating window state');
    isWindowOpenRef.current = false;
    
    console.log('handleCloseClick - Clearing states');
    setEditingAnnotation(null);
    setActiveAnnotationIndex(null);
    setIsEditingAnnotations(false);
    setSelectedImage(null);
    setSelectedSnag(null);
    
    if (onClose) {
      console.log('handleCloseClick - Calling parent onClose');
      onClose();
    }
  };

  // Prevent unwanted state updates during processing
  useEffect(() => {
    if (!isProcessingAction && selectedSnag) {
      const currentSnag = snags.find(s => s.id === selectedSnag.id);
      if (currentSnag && (
        currentSnag.description !== selectedSnag.description ||
        currentSnag.priority !== selectedSnag.priority ||
        currentSnag.status !== selectedSnag.status ||
        currentSnag.assignedTo !== selectedSnag.assignedTo ||
        currentSnag.name !== selectedSnag.name ||
        currentSnag.location !== selectedSnag.location
      )) {
        // Only update if actual data has changed, preserve editing state
        setSelectedSnag((prev: Snag | null): Snag | null => {
          if (!prev) return null;
          
          // Ensure we have all required fields from the current snag
          const updatedSnag: Snag = {
            id: prev.id,
            projectName: prev.projectName,
            description: currentSnag.description,
            priority: currentSnag.priority,
            status: currentSnag.status,
            assignedTo: currentSnag.assignedTo,
            name: currentSnag.name,
            location: currentSnag.location,
            photoPath: prev.photoPath || currentSnag.photoPath,
            annotations: prev.annotations || currentSnag.annotations || [],
            createdAt: prev.createdAt,
            updatedAt: prev.updatedAt,
            completionDate: prev.completionDate,
            snagNumber: prev.snagNumber
          };
          
          return updatedSnag;
        });
      }
    }
  }, [snags, selectedSnag, isProcessingAction]);

  // Add cleanup effect to prevent window closing during operations
  useEffect(() => {
    let isActive = true;
    
    const cleanup = () => {
      isActive = false;
    };

    if (selectedSnag && isEditingAnnotations) {
      // Prevent state updates during editing
      const handleBeforeStateUpdate = () => {
        if (isEditingAnnotations) {
          return false;
        }
      };

      window.addEventListener('beforeunload', cleanup);
      return () => {
        window.removeEventListener('beforeunload', cleanup);
        // Only clear states if component is still mounted and not processing
        if (isActive && !isProcessingAction && !isEditingAnnotations) {
          setEditingAnnotation(null);
          setActiveAnnotationIndex(null);
        }
      };
    }
  }, [selectedSnag, isEditingAnnotations, isProcessingAction]);

  // Add effect to maintain editing state
  useEffect(() => {
    if (selectedSnag && isEditingAnnotations) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          setIsEditingAnnotations(true);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [selectedSnag, isEditingAnnotations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-hidden">
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 h-16 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex items-center justify-between px-6 z-10`}>
        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Grid View
        </h2>
        <button
          onClick={handleCloseClick}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
        >
          <X className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Grid Container */}
      <div className="mt-16 p-6 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {snags.map((snag, index) => (
            <div
              key={snag.id}
              className={`relative group aspect-square rounded-lg overflow-hidden border ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              } hover:border-blue-500 transition-all cursor-pointer`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(snag.photoPath);
                setSelectedSnag(snag);
              }}
              onMouseEnter={() => setHoveredId(snag.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Entry Number and Status */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                  #{snag.snagNumber}
                </div>
                {snag.status === 'Completed' && (
                  <div className="bg-green-500/90 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    Completed
                  </div>
                )}
              </div>

              {/* Details Button */}
              <button
                onClick={(e) => handleDetailsClick(e, snag)}
                className={cn(
                  "absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-300 transform",
                  hoveredId === snag.id 
                    ? "scale-100 rotate-0 bg-white/90 hover:bg-white" 
                    : "scale-0 rotate-180 bg-white/70",
                  isDarkMode && hoveredId === snag.id && "bg-gray-800/90 hover:bg-gray-800"
                )}
              >
                <Info className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isDarkMode ? "text-white" : "text-gray-800",
                  hoveredId === snag.id && "animate-pulse"
                )} />
              </button>

              <Image
                src={snag.photoPath}
                alt={snag.description || 'Snag image'}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              
              {/* Description Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4`}>
                <p className="text-white text-sm line-clamp-2">
                  {snag.description || 'No description'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-size Image Modal with Annotations */}
      {selectedImage && selectedSnag && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
          onClick={(e) => {
            // Prevent any click events from propagating up
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setIsEditingAnnotations(!isEditingAnnotations)}
              className={cn(
                "px-4 py-2 rounded-full transition-colors",
                isEditingAnnotations
                  ? isDarkMode
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                  : isDarkMode
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {isEditingAnnotations ? "✓ Adding Pins" : "+ Add Pins"}
            </button>
            {isEditingAnnotations && (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
                <button
                  onClick={() => setPinSize(Math.max(12, pinSize - 4))}
                  className="text-white hover:text-blue-300 transition-colors"
                >
                  -
                </button>
                <span className="text-white text-sm">Pin Size</span>
                <button
                  onClick={() => setPinSize(Math.min(48, pinSize + 4))}
                  className="text-white hover:text-blue-300 transition-colors"
                >
                  +
                </button>
              </div>
            )}
            <button
              onClick={handleCloseClick}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Close"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Image Container with Annotations */}
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4">
            <div className="relative w-full h-full" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{ pointerEvents: 'all' }}
            >
              <Image
                src={selectedImage}
                alt="Full size image"
                fill
                className={cn(
                  "object-contain",
                  isEditingAnnotations && "cursor-crosshair"
                )}
                onClick={handleImageClick}
                onMouseDown={(e) => e.stopPropagation()}
                sizes="100vw"
              />
              
              {/* Annotation Pins */}
              {selectedSnag.annotations?.map((annotation, index) => (
                <AnnotationPin
                  key={annotation.id}
                  number={index}
                  x={annotation.x}
                  y={annotation.y}
                  text={annotation.text}
                  isActive={activeAnnotationIndex === index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEditingAnnotations) {
                      setEditingAnnotation({ id: annotation.id, text: annotation.text });
                    } else {
                      setActiveAnnotationIndex(activeAnnotationIndex === index ? null : index);
                    }
                  }}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>

            {/* Annotation List */}
            {selectedSnag?.annotations && selectedSnag.annotations.length > 0 && (
              <div 
                className={cn(
                  "absolute w-80 rounded-lg shadow-xl border p-4 space-y-3",
                  isDarkMode ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-200",
                  isDragging && "cursor-grabbing"
                )}
                style={{
                  top: dragPosition.y,
                  left: dragPosition.x,
                }}
                onClick={e => e.stopPropagation()}
              >
                <div 
                  ref={dragRef}
                  className="flex items-center justify-between mb-2"
                >
                  <div className="flex items-center gap-2">
                    <GripHorizontal className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"} cursor-grab active:cursor-grabbing`} />
                    <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Annotations
                    </h3>
                  </div>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {selectedSnag.annotations.map((annotation, index) => (
                    <div
                      key={annotation.id}
                      className={cn(
                        "p-3 rounded-lg transition-colors",
                        activeAnnotationIndex === index
                          ? isDarkMode
                            ? "bg-blue-500/20 border border-blue-500"
                            : "bg-blue-50 border border-blue-200"
                          : isDarkMode
                          ? "hover:bg-gray-700/50"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                          activeAnnotationIndex === index
                            ? "bg-blue-500 text-white"
                            : isDarkMode
                            ? "bg-gray-700 text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        )}>
                          {index + 1}
                        </div>
                        {editingAnnotation?.id === annotation.id ? (
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={editingAnnotation.text}
                              onChange={(e) => setEditingAnnotation({ ...editingAnnotation, text: e.target.value })}
                              className={cn(
                                "w-full px-2 py-1 rounded border text-sm",
                                isDarkMode
                                  ? "bg-gray-700 border-gray-600 text-white"
                                  : "bg-white border-gray-200 text-gray-900"
                              )}
                              placeholder="Enter annotation text..."
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingAnnotation(null)}
                                className={cn(
                                  "px-2 py-1 rounded text-sm",
                                  isDarkMode
                                    ? "hover:bg-gray-700 text-gray-300"
                                    : "hover:bg-gray-100 text-gray-600"
                                )}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleAnnotationSave}
                                className="px-2 py-1 rounded text-sm bg-blue-500 text-white hover:bg-blue-600"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <p className={`text-sm ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                              {annotation.text}
                            </p>
                            {isEditingAnnotations && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => setEditingAnnotation({ id: annotation.id, text: annotation.text })}
                                  className="text-xs text-blue-500 hover:text-blue-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleAnnotationDelete(annotation.id)}
                                  className="text-xs text-red-500 hover:text-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Card */}
      {selectedDetails && (
        <DetailsCard
          snag={selectedDetails.snag}
          position={selectedDetails.position}
          onClose={() => setSelectedDetails(null)}
          onEdit={handleEdit}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Edit Dialog */}
      {editingId && (
        <div 
          className="fixed inset-0 bg-black/60 z-[100] overflow-hidden"
          onClick={(e) => {
            // Only close if clicking the backdrop
            if (e.target === e.currentTarget) {
              setEditingId(null);
            }
          }}
        >
          <div
            ref={dragRef}
            className={cn(
              "fixed top-[20%] left-1/2 -translate-x-1/2 w-[425px] rounded-lg shadow-xl",
              isDarkMode ? "bg-gray-800" : "bg-white"
            )}
            style={{
              top: dragPosition.y,
              left: dragPosition.x,
              transform: 'none' // Remove the translate since we're using absolute positioning
            }}
          >
            {/* Draggable Header */}
            <div 
              className={cn(
                "px-6 py-4 border-b cursor-grab active:cursor-grabbing",
                isDarkMode ? "border-gray-700" : "border-gray-200"
              )}
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    isDarkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
                  )}>
                    #{snags.findIndex(s => s.id === editingId) + 1}
                  </div>
                  <h2 className={cn(
                    "text-lg font-semibold",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    Edit Entry
                  </h2>
                </div>
                <button
                  onClick={() => setEditingId(null)}
                  className={cn(
                    "rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  )}
                >
                  <X className={cn(
                    "h-5 w-5",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )} />
                </button>
              </div>
              <p 
                className={cn(
                  "text-sm mt-1.5",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Make changes to the entry details below.
              </p>
            </div>

            {/* Form Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label 
                  htmlFor="name" 
                  className={isDarkMode ? "text-gray-200" : "text-gray-700"}
                >
                  Name
                </Label>
                <Input
                  id="name"
                  value={editState.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditState((prev: EditState) => ({ ...prev, name: e.target.value }))
                  }
                  className={cn(
                    "border",
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-white" 
                      : "bg-white border-gray-200 text-gray-900"
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label 
                  htmlFor="description"
                  className={isDarkMode ? "text-gray-200" : "text-gray-700"}
                >
                  Description
                </Label>
                <Input
                  id="description"
                  value={editState.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditState((prev: EditState) => ({ ...prev, description: e.target.value }))
                  }
                  className={cn(
                    "border",
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-white" 
                      : "bg-white border-gray-200 text-gray-900"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="status"
                    className={isDarkMode ? "text-gray-200" : "text-gray-700"}
                  >
                    Status
                  </Label>
                  <Select
                    value={editState.status}
                    onValueChange={(value: 'In Progress' | 'Completed') => 
                      setEditState((prev: EditState) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className={cn(
                      "border",
                      isDarkMode 
                        ? "bg-gray-700 border-gray-600 text-white" 
                        : "bg-white border-gray-200 text-gray-900"
                    )}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
                    )}>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="priority"
                    className={isDarkMode ? "text-gray-200" : "text-gray-700"}
                  >
                    Priority
                  </Label>
                  <Select
                    value={editState.priority}
                    onValueChange={(value: 'Low' | 'Medium' | 'High') => 
                      setEditState((prev: EditState) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger className={cn(
                      "border",
                      isDarkMode 
                        ? "bg-gray-700 border-gray-600 text-white" 
                        : "bg-white border-gray-200 text-gray-900"
                    )}>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
                    )}>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="location"
                  className={isDarkMode ? "text-gray-200" : "text-gray-700"}
                >
                  Location
                </Label>
                <Input
                  id="location"
                  value={editState.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditState((prev: EditState) => ({ ...prev, location: e.target.value }))
                  }
                  className={cn(
                    "border",
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-white" 
                      : "bg-white border-gray-200 text-gray-900"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="assignedTo"
                  className={isDarkMode ? "text-gray-200" : "text-gray-700"}
                >
                  Assigned To
                </Label>
                <Input
                  id="assignedTo"
                  value={editState.assignedTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditState((prev: EditState) => ({ ...prev, assignedTo: e.target.value }))
                  }
                  className={cn(
                    "border",
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-white" 
                      : "bg-white border-gray-200 text-gray-900"
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={cn(
              "flex justify-end gap-3 px-6 py-4 border-t",
              isDarkMode ? "border-gray-700" : "border-gray-200"
            )}>
              <Button 
                variant="outline" 
                onClick={() => setEditingId(null)}
                className={cn(
                  isDarkMode 
                    ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600" 
                    : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                )}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingId) {
                    const updatedSnag = {
                      ...snags.find(s => s.id === editingId)!,
                      name: editState.name,
                      description: editState.description,
                      status: editState.status,
                      priority: editState.priority,
                      location: editState.location,
                      assignedTo: editState.assignedTo,
                      updatedAt: new Date().toISOString(),
                      ...(editState.status === 'Completed' && { completionDate: new Date().toISOString() })
                    };

                    if (onSnagUpdate) {
                      onSnagUpdate(updatedSnag);
                    }
                    setEditingId(null);
                  }
                }}
                className={cn(
                  "text-white",
                  isDarkMode 
                    ? "bg-blue-600 hover:bg-blue-500" 
                    : "bg-blue-500 hover:bg-blue-600"
                )}
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