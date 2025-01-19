import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import ImageAnnotator from './ImageAnnotator';
import { QuickSnagVoiceTranscription } from './QuickSnagVoiceTranscription';
import { addSnag, updateSnag } from '@/lib/db';
import { generateThumbnail } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Maximize, Mic, MicOff, Sparkles, FolderOpen, Save, Check, AlertCircle, PencilLine, BookmarkPlus } from 'lucide-react';
import { Input } from './ui/input';

// Debug logger function
const debug = (component: string, action: string, data?: any) => {
  console.log(`[SnapLoad:${component}] ${action}`, data ? data : '');
};

interface SnapLoadProps {
  projectName: string;
  onComplete: () => void;
  isDarkMode?: boolean;
}

interface BatchImage {
  id: string;
  dbId?: string;
  file: File;
  dataUrl: string;
  name: string;
  description: string;
  annotations: any[];
  isProcessed: boolean;
  isSaved: boolean;
  lastSaved: Date | null;
}

export function SnapLoad({ projectName, onComplete, isDarkMode = false }: SnapLoadProps) {
  debug('Init', `Component initialized with project: ${projectName}`);
  
  const [location, setLocation] = useState<string>('');
  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    totalImages: 0,
    processedImages: 0,
    failedImages: 0,
    errors: [] as string[]
  });

  // Debug state changes
  useEffect(() => {
    debug('StateUpdate', 'State changed', {
      location,
      batchImagesCount: batchImages.length,
      selectedImageId,
      isAnnotating,
      isRecording,
      descriptionLength: description.length,
      isSaving,
      processingStats
    });
  }, [location, batchImages, selectedImageId, isAnnotating, isRecording, description, isSaving, processingStats]);

  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        debug('FolderSelect', 'No files selected');
        return;
      }

      debug('FolderSelect', `Selected ${files.length} files`);

      // Get folder name from the first file's path
      const folderPath = files[0].webkitRelativePath;
      const folderName = folderPath.split('/')[0];
      setLocation(folderName);
      debug('FolderSelect', `Folder name extracted: ${folderName}`);

      // Process each image file
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      debug('FolderSelect', `Found ${imageFiles.length} image files`);

      setProcessingStats(prev => ({
        ...prev,
        totalImages: imageFiles.length,
        processedImages: 0,
        failedImages: 0,
        errors: []
      }));

      const processedImages: BatchImage[] = [];
      
      for (const file of imageFiles) {
        try {
          debug('ImageProcessing', `Processing ${file.name}`);
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
          });

          processedImages.push({
            id: crypto.randomUUID(),
            file,
            dataUrl,
            name: file.name,
            description: '',
            annotations: [],
            isProcessed: false,
            isSaved: false,
            lastSaved: null
          });

          setProcessingStats(prev => ({
            ...prev,
            processedImages: prev.processedImages + 1
          }));

          debug('ImageProcessing', `Successfully processed ${file.name}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          debug('ImageProcessing', `Failed to process ${file.name}: ${errorMessage}`);
          
          setProcessingStats(prev => ({
            ...prev,
            failedImages: prev.failedImages + 1,
            errors: [...prev.errors, `Failed to process ${file.name}: ${errorMessage}`]
          }));
        }
      }

      debug('FolderSelect', `Processed ${processedImages.length} images successfully`);
      setBatchImages(processedImages);
      
      if (processedImages.length > 0) {
        setSelectedImageId(processedImages[0].id);
        debug('FolderSelect', `Selected first image: ${processedImages[0].id}`);
      } else {
        toast.error('No valid images found in the selected folder');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debug('FolderSelect', `Error in folder selection: ${errorMessage}`);
      toast.error('Failed to process folder');
    }
  };

  const handleImageSelect = (imageId: string) => {
    try {
      debug('ImageSelect', `Selecting image: ${imageId}`);
      const selectedImage = batchImages.find(img => img.id === imageId);
      if (!selectedImage) {
        debug('ImageSelect', 'Image not found in batch');
        return;
      }

      setSelectedImageId(imageId);
      setName(selectedImage.name);
      setDescription(selectedImage.description);
      debug('ImageSelect', 'Image selected and state updated', { name: selectedImage.name });
    } catch (error) {
      debug('ImageSelect', `Error selecting image: ${error}`);
      toast.error('Failed to select image');
    }
  };

  const handleAnnotationSave = async (newAnnotations: any[]) => {
    try {
      if (!selectedImageId) {
        debug('AnnotationSave', 'No image selected');
        return;
      }

      debug('AnnotationSave', `Saving annotations for image: ${selectedImageId}`, {
        annotationCount: newAnnotations.length
      });

      setBatchImages(prev => prev.map(img => 
        img.id === selectedImageId
          ? { 
              ...img, 
              annotations: newAnnotations, 
              description, 
              name,
              isSaved: false // Mark as unsaved when annotations change
            }
          : img
      ));

      setIsAnnotating(false);
      debug('AnnotationSave', 'Annotations saved successfully');
    } catch (error) {
      debug('AnnotationSave', `Error saving annotations: ${error}`);
      toast.error('Failed to save annotations');
    }
  };

  const saveCurrentEntry = async () => {
    if (!selectedImageId) {
      debug('SaveEntry', 'No image selected');
      return;
    }

    const currentImage = batchImages.find(img => img.id === selectedImageId);
    if (!currentImage) {
      debug('SaveEntry', 'Selected image not found in batch');
      return;
    }

    debug('SaveEntry', `Saving entry: ${currentImage.name}`, {
      annotationCount: currentImage.annotations.length,
      isUpdate: !!currentImage.dbId
    });
    
    try {
      let savedSnag;
      
      if (currentImage.dbId) {
        // Update existing entry
        debug('SaveEntry', `Updating existing entry with dbId: ${currentImage.dbId}`);
        savedSnag = await updateSnag(currentImage.dbId, {
          name: currentImage.name,
          description: currentImage.description,
          photoPath: currentImage.dataUrl,
          location,
          annotations: currentImage.annotations
        });
      } else {
        // Create new entry
        debug('SaveEntry', 'Creating new entry');
        
        // Generate thumbnail
        const thumbnail = await generateThumbnail(currentImage.dataUrl, {
          maxWidth: 800,
          quality: 0.95,
          maxSizeMB: 0.8
        });

        savedSnag = await addSnag({
          projectName,
          name: currentImage.name,
          description: currentImage.description,
          photoPath: currentImage.dataUrl,
          thumbnailPath: thumbnail,
          priority: 'Medium' as const,
          status: 'In Progress' as const,
          assignedTo: '',
          location,
          observationDate: new Date(),
          annotations: currentImage.annotations
        });
      }

      setBatchImages(prev => prev.map(img => 
        img.id === selectedImageId
          ? { 
              ...img, 
              dbId: savedSnag.id,  // Store the database ID
              isSaved: true, 
              lastSaved: new Date() 
            }
          : img
      ));

      debug('SaveEntry', `Successfully ${currentImage.dbId ? 'updated' : 'saved'} entry: ${currentImage.name}`);
      toast.success(`Entry ${currentImage.dbId ? 'updated' : 'saved'} successfully`);
    } catch (error) {
      debug('SaveEntry', `Failed to ${currentImage.dbId ? 'update' : 'save'} entry: ${error}`);
      toast.error(`Failed to ${currentImage.dbId ? 'update' : 'save'} entry`);
    }
  };

  const saveAllToDatabase = async () => {
    setIsSaving(true);
    debug('SaveAll', 'Starting batch save', { imageCount: batchImages.length });
    
    const savedImages: string[] = [];
    const updatedImages: string[] = [];
    const failedImages: string[] = [];
    const skippedImages: string[] = [];

    try {
      for (const image of batchImages) {
        try {
          // Skip if already saved and no changes made
          if (image.isSaved && !image.dbId) {
            debug('SaveAll', `Skipping already saved image: ${image.name}`);
            skippedImages.push(image.name);
            continue;
          }

          debug('SaveAll', `Processing image: ${image.name}`, {
            annotationCount: image.annotations.length,
            isUpdate: !!image.dbId
          });

          if (image.dbId) {
            // Update existing entry
            await updateSnag(image.dbId, {
              name: image.name,
              description: image.description,
              photoPath: image.dataUrl,
              location,
              annotations: image.annotations
            });
            updatedImages.push(image.name);
            debug('SaveAll', `Successfully updated image: ${image.name}`);
          } else {
            // Create new entry
            const thumbnail = await generateThumbnail(image.dataUrl, {
              maxWidth: 800,
              quality: 0.95,
              maxSizeMB: 0.8
            });

            const savedSnag = await addSnag({
              projectName,
              name: image.name,
              description: image.description,
              photoPath: image.dataUrl,
              thumbnailPath: thumbnail,
              priority: 'Medium' as const,
              status: 'In Progress' as const,
              assignedTo: '',
              location,
              observationDate: new Date(),
              annotations: image.annotations
            });
            savedImages.push(image.name);
            debug('SaveAll', `Successfully saved new image: ${image.name}`);
          }
        } catch (error) {
          debug('SaveAll', `Failed to process image: ${image.name}`, error);
          failedImages.push(image.name);
        }
      }
      
      debug('SaveAll', 'Batch save completed', {
        new: savedImages.length,
        updated: updatedImages.length,
        failed: failedImages.length,
        skipped: skippedImages.length
      });

      if (failedImages.length > 0) {
        toast.error(`Failed to save ${failedImages.length} images`);
      } else {
        let message = '';
        if (savedImages.length > 0 && updatedImages.length > 0) {
          message = `Saved ${savedImages.length} new and updated ${updatedImages.length} existing entries`;
        } else if (savedImages.length > 0) {
          message = `Saved ${savedImages.length} new entries`;
        } else if (updatedImages.length > 0) {
          message = `Updated ${updatedImages.length} entries`;
        } else {
          message = 'No changes to save';
        }
        if (skippedImages.length > 0) {
          message += ` (${skippedImages.length} already saved)`;
        }
        toast.success(message);
      }

      setBatchImages([]);
      setSelectedImageId(null);
      setLocation('');
      setName('');
      setDescription('');
      onComplete();
    } catch (error) {
      debug('SaveAll', 'Critical error in batch save', error);
      toast.error('Failed to save entries');
    } finally {
      setIsSaving(false);
    }
  };

  const startRecording = async () => {
    debug('Recording', 'Starting audio recording...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        debug('Recording', 'Audio data chunk received', { size: event.data.size });
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        debug('Recording', 'Recording stopped, preparing for transcription', {
          chunks: audioChunks.current.length,
          totalSize: audioChunks.current.reduce((acc, chunk) => acc + chunk.size, 0)
        });
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.current.start();
      debug('Recording', 'MediaRecorder started successfully');
      setIsRecording(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debug('Recording', `Error starting recording: ${errorMessage}`);
      toast.error('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    debug('Recording', 'Stopping recording...');
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      debug('Recording', 'Recording stopped and tracks cleared');
    } else {
      debug('Recording', 'Stop recording called but no active recording found');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    debug('Transcription', 'Starting audio transcription', { blobSize: audioBlob.size });
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      debug('Transcription', 'Sending audio for transcription');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed with status: ${response.status}`);
      }
      
      const { text } = await response.json();
      debug('Transcription', 'Received transcription', { text });
      
      if (!text) throw new Error('No transcription received');
      
      setDescription(prev => {
        const newDescription = prev + (prev ? ' ' : '') + text;
        debug('Transcription', 'Updated description', { newDescription });
        
        // If we have a selected image, update its description in the batch
        if (selectedImageId) {
          setBatchImages(prev => prev.map(img => 
            img.id === selectedImageId
              ? { ...img, description: newDescription }
              : img
          ));
          debug('Transcription', 'Updated batch image description', { imageId: selectedImageId });
        }
        
        return newDescription;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debug('Transcription', `Transcription error: ${errorMessage}`);
      toast.error('Failed to transcribe audio');
    }
  };

  const generateNameFromDescription = async () => {
    if (!description) {
      debug('NameGeneration', 'No description available');
      toast.error('Add a description first to generate a name');
      return;
    }

    try {
      debug('NameGeneration', 'Generating name from description', { description });
      const response = await fetch('/api/generate-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) throw new Error('Failed to generate name');
      
      const { name: generatedName } = await response.json();
      debug('NameGeneration', 'Received generated name', { generatedName });
      
      if (generatedName && generatedName !== name) {
        setName(generatedName);
        
        // If we have a selected image, update its name in the batch
        if (selectedImageId) {
          setBatchImages(prev => prev.map(img => 
            img.id === selectedImageId
              ? { ...img, name: generatedName }
              : img
          ));
          debug('NameGeneration', 'Updated batch image name', { imageId: selectedImageId });
        }
        
        toast.success('Name generated successfully');
      } else {
        debug('NameGeneration', 'Generated name was same as current name or empty');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debug('NameGeneration', `Error generating name: ${errorMessage}`);
      toast.error('Failed to generate name');
    }
  };

  if (batchImages.length > 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-[95vw] h-[90vh] flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Location: {location}</h2>
            <Button
              onClick={saveAllToDatabase}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save All'}</span>
            </Button>
          </div>
          
          <div className="flex-1 flex">
            {/* Grid of images */}
            <div className="w-1/4 p-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-2">
                {batchImages.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => handleImageSelect(image.id)}
                    className={cn(
                      "relative aspect-square cursor-pointer rounded-lg overflow-hidden group",
                      selectedImageId === image.id ? "ring-2 ring-blue-500" : ""
                    )}
                  >
                    {/* Thumbnail Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="object-cover w-full h-full"
                    />
                    
                    {/* Status Indicators (Always Visible) */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {image.annotations.length > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-md">
                          {image.annotations.length} ⚡
                        </span>
                      )}
                      {image.isSaved ? (
                        <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3" /> Saved
                        </span>
                      ) : image.description || image.annotations.length > 0 ? (
                        <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Unsaved
                        </span>
                      ) : null}
                    </div>
                    
                    {/* Hover Metadata Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                      <div className="text-white text-xs truncate">
                        {image.name || 'Unnamed'}
                      </div>
                      {image.description && (
                        <div className="text-white text-xs truncate">
                          {image.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected image with annotation */}
            <div className="flex-1 relative overflow-hidden">
              {selectedImageId && (
                isAnnotating ? (
                  <div className="h-full">
                    <ImageAnnotator
                      imageUrl={batchImages.find(img => img.id === selectedImageId)?.dataUrl || ''}
                      existingAnnotations={batchImages.find(img => img.id === selectedImageId)?.annotations || []}
                      onSave={handleAnnotationSave}
                      onClose={() => setIsAnnotating(false)}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 relative p-4 flex items-center justify-center overflow-hidden">
                      <div className="relative max-h-full max-w-full">
                        {/* Main Image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={batchImages.find(img => img.id === selectedImageId)?.dataUrl}
                          alt={name}
                          className="max-h-[calc(85vh-16rem)] w-auto object-contain"
                        />

                        {/* Metadata Overlay */}
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 text-white">
                          <h3 className="text-lg font-semibold mb-1">{name || 'Unnamed'}</h3>
                          {description && (
                            <p className="text-sm opacity-90 line-clamp-2">{description}</p>
                          )}
                        </div>

                        {/* Annotation Preview Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          {batchImages.find(img => img.id === selectedImageId)?.annotations.map((annotation: any, index: number) => (
                            <div
                              key={annotation.id || index}
                              className="absolute"
                              style={{
                                left: `${annotation.x}%`,
                                top: `${annotation.y}%`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <div className="w-5 h-5 bg-blue-500 rounded-full opacity-80 flex items-center justify-center text-white text-xs font-medium">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Annotation List */}
                        <div className="absolute bottom-4 left-4 max-w-[200px] bg-white/30 dark:bg-gray-800/30 backdrop-blur-[2px] rounded-lg shadow-sm p-1.5 text-xs">
                          {batchImages.find(img => img.id === selectedImageId)?.annotations.length ? (
                            <div className="space-y-1">
                              {batchImages.find(img => img.id === selectedImageId)?.annotations.map((annotation: any, index: number) => (
                                <div 
                                  key={annotation.id || index}
                                  className="flex items-start gap-1.5 p-0.5 hover:bg-white/10 dark:hover:bg-black/10 rounded"
                                  onMouseEnter={() => {
                                    // Could add hover effect on the marker
                                  }}
                                >
                                  <div className="w-3 h-3 bg-blue-500/60 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-medium">
                                    {index + 1}
                                  </div>
                                  <span className="text-gray-900/90 dark:text-white/90 text-[10px] leading-tight font-semibold">
                                    {annotation.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500/70 dark:text-gray-400/70 text-center py-0.5 text-[10px]">
                              No annotations yet
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                          <Button
                            onClick={saveCurrentEntry}
                            variant="default"
                            size="icon"
                            className="bg-green-600/90 hover:bg-green-700 shadow-md rounded-full h-8 w-8"
                            title="Save Entry"
                          >
                            <BookmarkPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => setIsAnnotating(true)}
                            variant="secondary"
                            size="icon"
                            className="shadow-md rounded-full bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 h-8 w-8"
                            title="Add Annotations"
                          >
                            <PencilLine className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3 bg-white dark:bg-gray-800">
                      {/* Status Bar */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          {batchImages.find(img => img.id === selectedImageId)?.isSaved ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              Last saved: {batchImages.find(img => img.id === selectedImageId)?.lastSaved?.toLocaleString()}
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                              Not saved yet
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <span className="font-medium">
                            {batchImages.find(img => img.id === selectedImageId)?.annotations.length}
                          </span>
                          annotations
                        </div>
                      </div>

                      {/* Input Controls */}
                      <div className="grid gap-3 max-w-3xl mx-auto w-full">
                        <div className="flex items-center gap-3">
                          <Input
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              setBatchImages(prev => prev.map(img => 
                                img.id === selectedImageId
                                  ? { ...img, name: e.target.value, isSaved: false }
                                  : img
                              ));
                            }}
                            placeholder="Entry name..."
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={generateNameFromDescription}
                            className={cn(
                              'transition-colors',
                              'hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                            title="Generate name from description"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            value={description}
                            onChange={(e) => {
                              setDescription(e.target.value);
                              setBatchImages(prev => prev.map(img => 
                                img.id === selectedImageId
                                  ? { ...img, description: e.target.value, isSaved: false }
                                  : img
                              ));
                            }}
                            placeholder="Add a description..."
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn(
                              'transition-colors',
                              isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''
                            )}
                          >
                            {isRecording ? (
                              <MicOff className="h-4 h-4" />
                            ) : (
                              <Mic className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        // @ts-ignore
        webkitdirectory=""
        // @ts-ignore
        directory=""
        ref={fileInputRef}
        className="hidden"
        onChange={handleFolderSelect}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex items-center gap-2",
          isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
        )}
      >
        <FolderOpen className="w-4 h-4" />
        <span>Select Folder</span>
      </Button>
    </>
  );
} 