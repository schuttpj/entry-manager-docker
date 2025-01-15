"use client"

import { X, Grid, Info, Calendar, User, MapPin, AlertTriangle, MessageCircle, GripHorizontal, Pencil, Search, SortDesc, XCircle, Mic, Sparkles } from 'lucide-react';
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
import { SnagVoiceTranscription } from './SnagVoiceTranscription';
import ImageAnnotator from './ImageAnnotator';

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

interface GridItemProps {
  snag: Snag;
  isDarkMode?: boolean;
  onSnagUpdate?: (updatedSnag: Snag) => void;
  onImageClick: (snag: Snag) => void;
  onDetailsClick: (e: React.MouseEvent, snag: Snag) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

function AnnotationPin({ number, x, y, text, isActive, onClick, isDarkMode, isTemporary }: AnnotationPinProps) {
  // ... existing AnnotationPin component ...
}

function GridItem({ 
  snag, 
  isDarkMode, 
  onSnagUpdate, 
  onImageClick, 
  onDetailsClick,
  hoveredId,
  onHover
}: GridItemProps) {
  return (
    <div
      className={`relative group aspect-square rounded-lg overflow-hidden border ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      } hover:border-blue-500 transition-all cursor-pointer`}
      onClick={(e) => {
        e.stopPropagation();
        onImageClick(snag);
      }}
      onMouseEnter={() => onHover(snag.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Header Info */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
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
        
        {/* Snag Name */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium max-w-[200px] truncate",
            "flex items-center gap-2"
          )}>
            <span className="truncate">{snag.name || 'Untitled Entry'}</span>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!snag.description) {
                  toast.error('Add a description first to generate a name');
                  return;
                }

                try {
                  console.log('Generating name for description:', snag.description);
                  const response = await fetch('/api/generate-name', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ description: snag.description }),
                  });

                  if (!response.ok) throw new Error('Failed to generate name');
                  
                  const { name } = await response.json();
                  console.log('Generated name:', name);
                  
                  if (name && name !== snag.name) {
                    const updatedSnag = {
                      ...snag,
                      name,
                      updatedAt: new Date().toISOString()
                    };
                    console.log('Updating snag with new name:', updatedSnag);
                    if (onSnagUpdate) {
                      onSnagUpdate(updatedSnag);
                      toast.success('Name updated successfully');
                    }
                  }
                } catch (error) {
                  console.error('Error generating name:', error);
                  toast.error('Failed to generate name');
                }
              }}
              className={cn(
                "p-1 rounded-full hover:bg-white/20 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-white/20"
              )}
              title="Generate name from description"
            >
              <Sparkles className="h-3.5 w-3.5 text-white/80" />
            </button>
          </div>
        </div>
      </div>

      {/* Details Button */}
      <button
        onClick={(e) => onDetailsClick(e, snag)}
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
  );
}

function DetailsCard({ snag, onClose, onEdit, isDarkMode, position }: DetailsCardProps) {
  const [dragPosition, setDragPosition] = useState(position);
  
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [showVoiceTranscription, setShowVoiceTranscription] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      e.preventDefault();
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - dragPosition.x,
        y: e.clientY - dragPosition.y
      };
      
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      
      const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingRef.current) {
          // Apply boundary checks during dragging
          const newX = Math.min(Math.max(0, e.clientX - dragStartRef.current.x), window.innerWidth - 320);
          const newY = Math.min(Math.max(0, e.clientY - dragStartRef.current.y), window.innerHeight - 400);
          setDragPosition({
            x: newX,
            y: newY
          });
        }
      };
      
      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  return (
    <div 
      className={`fixed z-[200] w-80 pointer-events-auto ${
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
            Entry #{snag.snagNumber}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Exit button clicked in GridView');
              onClose();
            }}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
          >
            <X className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1">
                <MessageCircle className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowVoiceTranscription(true)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  title="Add voice transcription"
                >
                  <Mic className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <button
                  onClick={() => onEdit(snag)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  title="Edit entry"
                >
                  <Pencil className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {snag.description || 'No description provided'}
            </p>
          </div>

          {/* Status and Priority */}
          <div className="flex gap-3">
            <div>
              <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Status
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                snag.status === 'Completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  snag.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                {snag.status}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Priority
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                snag.priority === 'High'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : snag.priority === 'Medium'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                <AlertTriangle className="h-3 w-3" />
                {snag.priority}
              </div>
            </div>
          </div>

          {/* Location and Assigned To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <MapPin className={`h-3 w-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Location</span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {snag.location || 'Not specified'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <User className={`h-3 w-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Assigned to</span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {snag.assignedTo || 'Unassigned'}
              </p>
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

      {showVoiceTranscription && (
        <SnagVoiceTranscription
          snagId={snag.id}
          currentDescription={snag.description || ''}
          currentName={snag.name || 'Untitled Entry'}
          onSnagUpdate={(updates) => {
            const updatedSnag = {
              ...snag,
              ...updates,
              updatedAt: new Date().toISOString()
            };
            onEdit(updatedSnag);
            setShowVoiceTranscription(false);
          }}
          isDarkMode={isDarkMode}
          position={{
            x: Math.max(0, (window.innerWidth - 400) / 2),
            y: Math.max(0, (window.innerHeight - 400) / 2)
          }}
          onClose={() => setShowVoiceTranscription(false)}
        />
      )}
    </div>
  );
}

export function GridView({ snags, isOpen, onClose, isDarkMode = false, onSnagUpdate }: GridViewProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSnag, setSelectedSnag] = useState<Snag | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filteredGridSnags, setFilteredGridSnags] = useState<Snag[]>(snags);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<{
    snag: Snag;
    position: { x: number; y: number };
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    description: '',
    priority: 'Medium',
    assignedTo: '',
    status: 'In Progress',
    name: '',
    location: '',
    observationDate: format(new Date(), 'yyyy-MM-dd')
  });

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

  const handleDetailsClick = useCallback((e: React.MouseEvent, snag: Snag) => {
    e.stopPropagation();
    
    // Center position calculation
    const position = {
      x: Math.max(0, (window.innerWidth - 320) / 2),
      y: Math.max(0, (window.innerHeight - 400) / 2)
    };
    
    setSelectedDetails({ snag, position });
  }, []);

  // Add effect to handle visibility
  useEffect(() => {
    console.log('GridView isOpen changed:', isOpen);
    if (!isOpen) {
      // Clean up any state when closing
      setSelectedImage(null);
      setSelectedSnag(null);
      setSelectedDetails(null);
      setEditingId(null);
    }
  }, [isOpen]);

  // Only render if isOpen is true
  if (!isOpen) {
    console.log('GridView not rendering - isOpen is false');
    return null;
  }

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
          onClick={(e) => {
            e.stopPropagation();
            console.log('Exit button clicked in GridView');
            onClose();
          }}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
        >
          <X className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Grid Container */}
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
            filteredGridSnags.map((snag) => (
              <GridItem
                key={snag.id}
                snag={snag}
                isDarkMode={isDarkMode}
                onSnagUpdate={onSnagUpdate}
                onImageClick={(snag) => {
                  setSelectedImage(snag.photoPath);
                  setSelectedSnag(snag);
                }}
                onDetailsClick={handleDetailsClick}
                hoveredId={hoveredId}
                onHover={setHoveredId}
              />
            ))
          )}
        </div>
      </div>

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

      {/* Image Annotator */}
      {selectedImage && selectedSnag && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center">
          <ImageAnnotator
            imageUrl={selectedImage}
            existingAnnotations={selectedSnag.annotations || []}
            onSave={async (annotations) => {
              if (onSnagUpdate) {
                const updatedSnag = {
                  ...selectedSnag,
                  annotations,
                  updatedAt: new Date().toISOString()
                };
                await updateSnagAnnotations(selectedSnag.id, annotations);
                onSnagUpdate(updatedSnag);
                toast.success('Annotations saved successfully');
              }
              setSelectedImage(null);
              setSelectedSnag(null);
            }}
            onClose={() => {
              setSelectedImage(null);
              setSelectedSnag(null);
            }}
          />
        </div>
      )}

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
                onClick={() => {
                  setEditingId(null);
                  setEditState({
                    description: '',
                    priority: 'Medium',
                    assignedTo: '',
                    status: 'In Progress',
                    name: '',
                    location: '',
                    observationDate: format(new Date(), 'yyyy-MM-dd')
                  });
                }}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                    Priority
                  </Label>
                  <Select
                    value={editState.priority}
                    onValueChange={(value) => setEditState((prev) => ({ ...prev, priority: value as 'Low' | 'Medium' | 'High' }))}
                  >
                    <SelectTrigger className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
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
                    onValueChange={(value) => setEditState((prev) => ({ ...prev, status: value as 'In Progress' | 'Completed' }))}
                  >
                    <SelectTrigger className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditState({
                      description: '',
                      priority: 'Medium',
                      assignedTo: '',
                      status: 'In Progress',
                      name: '',
                      location: '',
                      observationDate: format(new Date(), 'yyyy-MM-dd')
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (onSnagUpdate) {
                      const updatedSnag = {
                        ...snags.find(s => s.id === editingId)!,
                        ...editState,
                        updatedAt: new Date().toISOString()
                      };
                      onSnagUpdate(updatedSnag);
                      setEditingId(null);
                      toast.success('Entry updated successfully');
                    }
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ... rest of existing modals ... */}
    </div>
  );
} 