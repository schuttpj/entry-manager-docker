"use client"

import { X, Grid, Info, Calendar, User, MapPin, AlertTriangle, MessageCircle, GripHorizontal, Pencil, Search, SortDesc, XCircle } from 'lucide-react';
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
  isTemporary?: boolean;
}

interface EditState {
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'In Progress' | 'Completed';
  name: string;
  location: string;
  observationDate: string;
}

function AnnotationPin({ number, x, y, text, isActive, onClick, isDarkMode, isTemporary }: AnnotationPinProps) {
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
  const [dragPosition, setDragPosition] = useState(position);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - dragPosition.x,
        y: e.clientY - dragPosition.y
      };
      
      const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingRef.current) {
          setDragPosition({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
          });
        }
      };
      
      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  return (
    <div 
      className={`fixed z-[200] w-80 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      } rounded-lg shadow-xl border ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      } transform transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2`}
      style={{
        top: `${dragPosition.y}px`,
        left: `${dragPosition.x}px`,
        willChange: 'transform',
      }}
    >
      <div className="p-4">
        <div 
          ref={dragRef}
          className="flex justify-between items-start mb-3 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <span className={`inline-flex items-center gap-2`}>
              <span className={`px-2 py-0.5 rounded-full text-sm ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                #{snag.snagNumber}
              </span>
              {snag.name || 'Untitled Entry'}
            </span>
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
                <span>Observation Date</span>
              </div>
              <p className="text-xs">{format(new Date(snag.observationDate), 'MMM d, yyyy')}</p>
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
    location: '',
    observationDate: format(new Date(), 'yyyy-MM-dd')
  });

  // Dragging state
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ 
    right: 40, // 40px from the right edge
    y: 80 // Just below the header
  });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Add temporary annotations state
  const [tempAnnotations, setTempAnnotations] = useState<Annotation[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add this near the top of the component, with other state
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Add state for search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGridSnags, setFilteredGridSnags] = useState<Snag[]>(snags);

  // Update ref when window opens/closes
  useEffect(() => {
    isWindowOpenRef.current = isOpen;
  }, [isOpen]);

  // Add debug logging utility
  const debugLog = (area: string, event: string, data?: any) => {
    console.log(`[GridView Debug] ${area} - ${event}`, {
      timestamp: new Date().toISOString(),
      windowOpen: isWindowOpenRef.current,
      isProcessing: isProcessingAction,
      selectedImageExists: !!selectedImage,
      selectedSnagExists: !!selectedSnag,
      isEditing: isEditingAnnotations,
      activeAnnotation: activeAnnotationIndex,
      editingAnnotation: !!editingAnnotation,
      ...data
    });
  };

  // Add effect to track state changes
  useEffect(() => {
    debugLog('StateChange', 'Window State Updated', { isOpen });
  }, [isOpen]);

  useEffect(() => {
    debugLog('StateChange', 'Selected Image/Snag Updated', {
      hasImage: !!selectedImage,
      hasSnag: !!selectedSnag
    });
  }, [selectedImage, selectedSnag]);

  useEffect(() => {
    debugLog('StateChange', 'Editing State Updated', {
      isEditingAnnotations,
      editingAnnotation
    });
  }, [isEditingAnnotations, editingAnnotation]);

  // Update mouse handlers with detailed logging
  const handleMouseDown = (e: React.MouseEvent) => {
    debugLog('MouseEvent', 'MouseDown Started', {
      target: e.target,
      currentTarget: e.currentTarget,
      isDragRef: !!dragRef.current?.contains(e.target as Node)
    });

    if (!dragRef.current?.contains(e.target as Node)) {
      debugLog('MouseEvent', 'MouseDown Rejected - Not in drag ref');
      return;
    }
    
    setIsDragging(true);
    setDragStart({
      x: window.innerWidth - e.clientX - dragPosition.right,
      y: e.clientY - dragPosition.y
    });

    e.preventDefault();
    debugLog('MouseEvent', 'MouseDown Completed', { isDragging: true });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    debugLog('MouseEvent', 'MouseMove', {
      clientX: e.clientX,
      clientY: e.clientY,
      dragStart,
      dragPosition
    });

    const newRight = Math.max(20, window.innerWidth - e.clientX - dragStart.x);
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, window.innerHeight - 100));

    setDragPosition({ right: newRight, y: newY });
  }, [isDragging, dragStart, dragPosition]);

  const handleMouseUp = useCallback(() => {
    debugLog('MouseEvent', 'MouseUp', { wasDragging: isDragging });
    setIsDragging(false);
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      // Add cursor styles to body
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Reset cursor styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Simplify image click handler to only update temporary state
  const handleImageClick = (e: React.MouseEvent) => {
    debugLog('ImageClick', 'Started');

    e.preventDefault();
    e.stopPropagation();

    if (!isEditingAnnotations || !selectedSnag) {
      return;
    }

    const target = e.target as HTMLElement;
    if (!(target instanceof HTMLImageElement)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      x,
      y,
      text: '',
      size: pinSize
    };

    setTempAnnotations(prev => [...prev, newAnnotation]);
    setEditingAnnotation({ id: newAnnotation.id, text: '' });
    setActiveAnnotationIndex(tempAnnotations.length);
    setHasUnsavedChanges(true);
  };

  // Update save handler to handle all annotation changes
  const handleSaveAnnotations = async () => {
    if (!selectedSnag) return;

    debugLog('SaveAnnotations', 'Started', { selectedSnag, tempAnnotations });
    setIsProcessingAction(true);
    
    try {
      // Combine existing and temporary annotations
      const existingAnnotations = selectedSnag.annotations.map(ann => {
        const editedTemp = editingAnnotation?.id === ann.id ? { ...ann, text: editingAnnotation.text } : ann;
        return editedTemp;
      });

      const allAnnotations = [...existingAnnotations, ...tempAnnotations];
      
      debugLog('SaveAnnotations', 'Saving to DB', { allAnnotations });
      
      // Save to database
      const dbUpdatedSnag = await updateSnagAnnotations(selectedSnag.id, allAnnotations);
      
      const finalSnag = {
        ...selectedSnag,
        ...dbUpdatedSnag,
        annotations: allAnnotations,
        updatedAt: new Date().toISOString()
      };

      debugLog('SaveAnnotations', 'DB Update Complete', { finalSnag });

      // Update local state
      setSelectedSnag(finalSnag);
      setTempAnnotations([]);
      setHasUnsavedChanges(false);
      setEditingAnnotation(null);
      setActiveAnnotationIndex(null);
      
      // Ensure parent component is updated for list view sync
      if (onSnagUpdate) {
        onSnagUpdate(finalSnag);
      }

      toast.success('All changes saved successfully');
    } catch (error) {
      console.error('Failed to save annotations:', error);
      toast.error('Failed to save changes to database');
      debugLog('SaveAnnotations', 'Error', { error });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Update the exit dialog save handler
  const handleSaveAndExit = async () => {
    debugLog('SaveAndExit', 'Started');
    try {
      await handleSaveAnnotations();
      closeWindow();
    } catch (error) {
      console.error('Failed to save before exit:', error);
      toast.error('Failed to save changes before closing');
    }
  };

  // Update annotation text change handler
  const handleAnnotationTextChange = (id: string, text: string) => {
    debugLog('AnnotationChange', 'Text Changed', { id, text });
    
    // Check if it's a temporary annotation
    const isTempAnnotation = tempAnnotations.some(ann => ann.id === id);
    
    if (isTempAnnotation) {
      setTempAnnotations(prev => 
        prev.map(ann => 
          ann.id === id ? { ...ann, text } : ann
        )
      );
    } else if (selectedSnag) {
      // Update the text in selectedSnag annotations
      setSelectedSnag(prev => {
        if (!prev) return null;
        return {
          ...prev,
          annotations: prev.annotations.map(ann =>
            ann.id === id ? { ...ann, text } : ann
          )
        };
      });
    }
    
    setEditingAnnotation({ id, text });
    setHasUnsavedChanges(true);
  };

  // Add effect to track changes that require saving
  useEffect(() => {
    const hasTemporaryAnnotations = tempAnnotations.length > 0;
    const hasEditedAnnotations = editingAnnotation !== null;
    
    debugLog('SaveState', 'Change Detection', {
      tempAnnotations: tempAnnotations.length,
      hasEditedAnnotations,
      currentSaveState: hasUnsavedChanges
    });

    if (hasTemporaryAnnotations || hasEditedAnnotations) {
      setHasUnsavedChanges(true);
    }
  }, [tempAnnotations, editingAnnotation]);

  // Update close handler to check for unsaved changes
  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      closeWindow();
    }
  };

  // Add a new function to handle the actual closing
  const closeWindow = () => {
    // Reset all states
    isWindowOpenRef.current = false;
    setEditingAnnotation(null);
    setActiveAnnotationIndex(null);
    setIsEditingAnnotations(false);
    setSelectedImage(null);
    setSelectedSnag(null);
    setTempAnnotations([]);
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
    
    if (onClose) {
      onClose();
    }
  };

  // Add new function to close just the annotation view
  const closeAnnotationView = () => {
    setEditingAnnotation(null);
    setActiveAnnotationIndex(null);
    setIsEditingAnnotations(false);
    setSelectedImage(null);
    setSelectedSnag(null);
    setTempAnnotations([]);
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
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
    if (!selectedSnag) return;

    // For temporary annotations, just update local state
    const isTempAnnotation = tempAnnotations.some(ann => ann.id === annotationId);
    if (isTempAnnotation) {
      setTempAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
      if (tempAnnotations.length === 1) {
        setHasUnsavedChanges(false);
      }
      setActiveAnnotationIndex(null);
      return;
    }

    // For saved annotations, mark as unsaved and update temporary state
    const updatedAnnotations = selectedSnag.annotations.filter(ann => ann.id !== annotationId);
    
    // Update the selected snag with the filtered annotations
    setSelectedSnag(prev => {
      if (!prev) return null;
      return {
        ...prev,
        annotations: updatedAnnotations
      };
    });
    
    // Mark as unsaved since we need to save the deletion
    setHasUnsavedChanges(true);
    setActiveAnnotationIndex(null);
  };

  // Update the delete button click handler
  const handleDeleteClick = (e: React.MouseEvent, index: number, annotation: Annotation) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isTempAnnotation = index >= (selectedSnag?.annotations?.length || 0);
    const message = isTempAnnotation 
      ? 'Are you sure you want to delete this unsaved annotation?' 
      : 'Are you sure you want to delete this annotation?';
    
    if (window.confirm(message)) {
      handleAnnotationDelete(annotation.id);
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
      location: snag.location || '',
      observationDate: snag.observationDate ? format(new Date(snag.observationDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
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

  // Add function to handle pin click
  const handlePinClick = (index: number, annotation: Annotation) => {
    debugLog('PinClick', 'Pin Clicked', { index, annotation });
    
    if (isEditingAnnotations) {
      setEditingAnnotation({ id: annotation.id, text: annotation.text });
      setActiveAnnotationIndex(index);
    } else {
      setActiveAnnotationIndex(activeAnnotationIndex === index ? null : index);
    }
  };

  // Add an effect to update position when window is resized
  useEffect(() => {
    const handleResize = () => {
      setDragPosition(prev => ({
        ...prev,
        right: 40 // Keep it 40px from the right edge
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add effect to filter snags when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredGridSnags(snags);
      return;
    }

    const filtered = snags.filter(snag => 
      (snag.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (snag.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (snag.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (snag.priority || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (snag.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (snag.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(snag.snagNumber).includes(searchTerm) ||
      snag.annotations?.some(annotation => 
        (annotation.text || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    setFilteredGridSnags(filtered);
  }, [searchTerm, snags]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-hidden">
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 h-16 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex items-center justify-between px-6 z-10`}>
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Grid View
            </h2>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              - Viewing entries for project:
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}>
              {snags[0]?.projectName || 'Untitled Project'}
            </span>
          </div>
          <div className="relative max-w-md flex-1">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 ${searchTerm ? 'pr-10' : 'pr-4'} py-2 rounded-full text-sm ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-gray-100/50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full 
                  ${isDarkMode 
                    ? 'hover:bg-gray-600/50 text-gray-400 hover:text-gray-300' 
                    : 'hover:bg-gray-200/50 text-gray-500 hover:text-gray-700'
                  } transition-colors`}
                title="Clear search"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredGridSnags.length} {filteredGridSnags.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
        <button
          onClick={handleCloseClick}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
        >
          <X className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Grid Container - Update to use filteredGridSnags */}
      <div className="mt-16 p-6 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGridSnags.length === 0 ? (
            <div className={`col-span-full flex flex-col items-center justify-center py-12 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No entries found</p>
              <p className="text-sm opacity-75">Try adjusting your search terms</p>
            </div>
          ) : (
            filteredGridSnags.map((snag, index) => (
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
            ))
          )}
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
              {isEditingAnnotations ? "✓ Adding & Editing Pins" : "+ Add & Edit Pins"}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (hasUnsavedChanges) {
                  setShowExitDialog(true);
                } else {
                  closeAnnotationView();
                }
              }}
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
              {[...(selectedSnag.annotations || []), ...tempAnnotations].map((annotation, index) => (
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
                    handlePinClick(index, annotation);
                  }}
                  isDarkMode={isDarkMode}
                  isTemporary={index >= (selectedSnag.annotations?.length || 0)}
                />
              ))}
            </div>

            {/* Annotation List */}
            {selectedImage && (
              <div 
                className={cn(
                  "absolute w-80 rounded-lg shadow-xl border p-4 space-y-3",
                  isDarkMode ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-200"
                )}
                style={{
                  top: `${dragPosition.y}px`,
                  right: `${dragPosition.right}px`,
                  zIndex: 150
                }}
                onClick={e => e.stopPropagation()}
              >
                <div 
                  ref={dragRef}
                  className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                >
                  <div className="flex items-center gap-2">
                    <GripHorizontal className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                    <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {isEditingAnnotations ? "Add & Edit Annotations" : "Annotations"} {tempAnnotations.length > 0 && `(${tempAnnotations.length} unsaved)`}
                    </h3>
                  </div>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {[...(selectedSnag?.annotations || []), ...tempAnnotations].map((annotation, index) => (
                    <div
                      key={annotation.id}
                      className={cn(
                        "p-3 rounded-lg transition-colors cursor-pointer",
                        activeAnnotationIndex === index
                          ? isDarkMode
                            ? "bg-blue-500/20 border border-blue-500"
                            : "bg-blue-50 border border-blue-200"
                          : isDarkMode
                          ? "hover:bg-gray-700/50"
                          : "hover:bg-gray-50",
                        index >= (selectedSnag.annotations?.length || 0) && "border border-green-500/50"
                      )}
                      onClick={() => handlePinClick(index, annotation)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                          activeAnnotationIndex === index
                            ? "bg-blue-500 text-white"
                            : isDarkMode
                            ? "bg-gray-700 text-white"
                            : "bg-white text-gray-900 border border-gray-200",
                          index >= (selectedSnag.annotations?.length || 0) && "border-green-500"
                        )}>
                          {index + 1}
                        </div>
                        {editingAnnotation?.id === annotation.id ? (
                          <div className="flex-1 space-y-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingAnnotation.text}
                              onChange={(e) => handleAnnotationTextChange(annotation.id, e.target.value)}
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
                                onClick={() => {
                                  setEditingAnnotation(null);
                                  setActiveAnnotationIndex(null);
                                }}
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
                                onClick={() => {
                                  if (!editingAnnotation) return;
                                  
                                  // Update the text in the appropriate state
                                  const isTempAnnotation = tempAnnotations.some(ann => ann.id === editingAnnotation.id);
                                  
                                  if (isTempAnnotation) {
                                    setTempAnnotations(prev =>
                                      prev.map(ann =>
                                        ann.id === editingAnnotation.id ? { ...ann, text: editingAnnotation.text } : ann
                                      )
                                    );
                                  } else if (selectedSnag) {
                                    setSelectedSnag(prev => {
                                      if (!prev) return null;
                                      return {
                                        ...prev,
                                        annotations: prev.annotations.map(ann =>
                                          ann.id === editingAnnotation.id ? { ...ann, text: editingAnnotation.text } : ann
                                        )
                                      };
                                    });
                                  }
                                  
                                  setEditingAnnotation(null);
                                  setActiveAnnotationIndex(index);
                                  setHasUnsavedChanges(true);
                                }}
                                className="px-2 py-1 rounded text-sm bg-blue-500 text-white hover:bg-blue-600"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <p className={`text-sm ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                              {annotation.text || 'No description'}
                            </p>
                            {isEditingAnnotations && (
                              <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAnnotation({ id: annotation.id, text: annotation.text });
                                    setActiveAnnotationIndex(index);
                                  }}
                                  className="text-xs text-blue-500 hover:text-blue-600 cursor-pointer"
                                >
                                  Edit
                                </div>
                                <div
                                  onClick={(e) => handleDeleteClick(e, index, annotation)}
                                  className="text-xs text-red-500 hover:text-red-600 cursor-pointer"
                                >
                                  Delete
                                </div>
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
              right: dragPosition.right,
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
                    #{snags.find(s => s.id === editingId)?.snagNumber || ''}
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
                  htmlFor="observationDate"
                  className={isDarkMode ? "text-gray-200" : "text-gray-700"}
                >
                  Observation Date
                </Label>
                <Input
                  id="observationDate"
                  type="date"
                  value={editState.observationDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditState((prev: EditState) => ({ ...prev, observationDate: e.target.value }))
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
                      observationDate: new Date(editState.observationDate),
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

      {/* Save Button for all changes - Ensure high z-index and proper positioning */}
      {hasUnsavedChanges && !editingAnnotation && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[150]">
          <button
            onClick={async () => {
              await handleSaveAnnotations();
              closeAnnotationView();
            }}
            disabled={isProcessingAction}
            className={cn(
              "px-6 py-3 rounded-full transition-colors shadow-lg",
              "bg-green-500 text-white hover:bg-green-600",
              "text-base font-medium",
              isProcessingAction && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessingAction ? "Saving Changes..." : "Save All Changes and Exit"}
          </button>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (
        <div 
          className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn(
            "w-[400px] rounded-lg shadow-xl",
            isDarkMode ? "bg-gray-800" : "bg-white"
          )}>
            <div className={cn(
              "px-6 py-4 border-b",
              isDarkMode ? "border-gray-700" : "border-gray-200"
            )}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  isDarkMode ? "text-yellow-500" : "text-yellow-600"
                )} />
                <h3 className={cn(
                  "text-lg font-semibold",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  Unsaved Changes
                </h3>
              </div>
              <p className={cn(
                "text-sm mt-2",
                isDarkMode ? "text-gray-300" : "text-gray-600"
              )}>
                You have unsaved changes. Would you like to save them before closing?
              </p>
            </div>
            <div className={cn(
              "px-6 py-4 flex justify-end gap-3",
              isDarkMode ? "bg-gray-800" : "bg-white"
            )}>
              <button
                onClick={() => closeWindow()}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isDarkMode 
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Discard Changes
              </button>
              <button
                onClick={async () => {
                  await handleSaveAndExit();
                }}
                className="px-4 py-2 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 