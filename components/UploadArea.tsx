import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, FileText, Info } from 'lucide-react';
import { addSnag } from '@/lib/db';
import { compressImage } from '@/lib/utils';

interface UploadAreaProps {
  projectName: string;
  onUploadComplete: () => void;
  isDarkMode?: boolean;
}

interface BatchFields {
  description: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  status?: 'In Progress' | 'Completed';
  location?: string;
  completionDate?: Date | null;
  observationDate?: Date;
}

interface Preview {
  file: File;
  preview: string;
  description: string;
  priority?: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  status?: 'In Progress' | 'Completed';
  location?: string;
  completionDate?: Date | null;
  observationDate?: Date;
}

export function UploadArea({ 
  projectName, 
  onUploadComplete,
  isDarkMode = false 
}: UploadAreaProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [descriptionFile, setDescriptionFile] = useState<File | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        URL.revokeObjectURL(preview.preview);
      });
    };
  }, [previews]);

  const readDescriptionFile = async (file: File): Promise<Record<string, BatchFields>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Get the base filename without extension (case-insensitive)
        const baseFileName = file.name.toLowerCase().replace(/\.[^/.]+$/, "");
        
        // Parse description and observation date if present
        let description = lines[0] || '';
        let observationDate: Date | undefined = undefined;
        
        console.log('Processing file:', file.name);
        console.log('Original description line:', description);
        
        // Find the last occurrence of YYYY-MM-DD pattern
        const dateMatch = description.match(/.*-(\d{4}-\d{2}-\d{2})$/);
        console.log('Date match:', dateMatch);
        
        if (dateMatch) {
          description = description.slice(0, -dateMatch[1].length - 1).trim();
          const dateStr = dateMatch[1];
          console.log('Extracted date string:', dateStr);
          
          try {
            const date = new Date(dateStr);
            // Check if date is valid and not NaN
            if (!isNaN(date.getTime())) {
              observationDate = date;
              console.log('Valid observation date set:', observationDate);
            } else {
              console.warn(`Invalid observation date value in file ${file.name}. Expected YYYY-MM-DD.`);
            }
          } catch (error) {
            console.error('Error parsing observation date:', error);
            console.warn(`Error parsing observation date in file ${file.name}. Expected YYYY-MM-DD.`);
          }
        } else {
          console.log('No date found in description');
        }

        // Parse status and completion date if present
        let status: BatchFields['status'] = undefined;
        let completionDate: Date | undefined = undefined;
        
        if (lines[3]) {
          const statusParts = lines[3].split('-');
          status = statusParts[0] as BatchFields['status'];
          
          // If status is Completed and there's a date part, try to parse it
          if (status === 'Completed' && statusParts[1]) {
            try {
              // Validate the date format strictly (YYYY-MM-DD)
              const dateStr = statusParts[1].trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const date = new Date(dateStr);
                // Check if date is valid and not NaN
                if (!isNaN(date.getTime())) {
                  completionDate = date;
                } else {
                  console.warn(`Invalid completion date value in file ${file.name}. Expected YYYY-MM-DD.`);
                }
              } else {
                console.warn(`Invalid completion date format in file ${file.name}. Expected YYYY-MM-DD.`);
              }
            } catch (error) {
              console.warn(`Error parsing completion date in file ${file.name}. Expected YYYY-MM-DD.`);
            }
          }
        }

        const fields: BatchFields = {
          description,
          priority: lines[1] as BatchFields['priority'],
          assignedTo: lines[2],
          status,
          location: lines[4],
          completionDate: completionDate || null,
          observationDate: observationDate
        };

        console.log('Final fields object:', fields);

        // Validate priority and status
        if (fields.priority && !['Low', 'Medium', 'High'].includes(fields.priority)) {
          console.warn(`Invalid priority "${fields.priority}" in file ${file.name}. Using default "Medium".`);
          fields.priority = undefined;
        }
        if (fields.status && !['In Progress', 'Completed'].includes(fields.status)) {
          console.warn(`Invalid status "${fields.status}" in file ${file.name}. Using default "In Progress".`);
          fields.status = undefined;
        }
        
        resolve({ [baseFileName]: fields });
      }
      reader.readAsText(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Filter out text files and image files
    const textFiles = acceptedFiles.filter(file => file.type === 'text/plain');
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));

    // If there are text files, read their contents
    if (textFiles.length > 0) {
      // Read all text files and merge their contents
      const descriptionsMap: Record<string, BatchFields> = {};
      await Promise.all(textFiles.map(async (file) => {
        const fileDescriptions = await readDescriptionFile(file);
        Object.assign(descriptionsMap, fileDescriptions);
      }));
      setDescriptionFile(textFiles[0]); // Show the first file name for UI purposes
      
      // Match images with descriptions based on filename (case-insensitive)
      const newPreviews = imageFiles.map(file => {
        const baseFileName = file.name.toLowerCase().replace(/\.[^/.]+$/, "");
        const fields = descriptionsMap[baseFileName] || { description: '' };
        
        return {
          file,
          preview: URL.createObjectURL(file),
          description: fields.description,
          priority: fields.priority,
          assignedTo: fields.assignedTo,
          status: fields.status,
          location: fields.location,
          completionDate: fields.completionDate,
          observationDate: fields.observationDate
        };
      });

      setPreviews(prev => [...prev, ...newPreviews]);
    } else {
      // Handle only image files
      const newPreviews = imageFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        description: ''
      }));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'text/plain': ['.txt']
    },
    disabled: uploading || !projectName
  });

  const handleUpload = async () => {
    if (!projectName || previews.length === 0) return;

    try {
      setUploading(true);
      setUploadStatus('idle');

      for (const preview of previews) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              if (typeof reader.result === 'string') {
                const compressedImage = await compressImage(reader.result, {
                  maxWidth: 1920,
                  quality: 0.8,
                  maxSizeMB: 2
                });

                // Validate and set default values for fields
                const priority = preview.priority && ['Low', 'Medium', 'High'].includes(preview.priority) 
                  ? preview.priority as 'Low' | 'Medium' | 'High'
                  : 'Medium';

                const status = preview.status && ['In Progress', 'Completed'].includes(preview.status)
                  ? preview.status as 'In Progress' | 'Completed'
                  : 'In Progress';
                
                console.log('Preview before addSnag:', preview);
                console.log('Observation date before addSnag:', preview.observationDate);
                
                await addSnag({
                  projectName,
                  description: preview.description,
                  photoPath: compressedImage,
                  priority,
                  assignedTo: preview.assignedTo || '',
                  status,
                  location: preview.location || '',
                  completionDate: preview.completionDate || null,
                  observationDate: preview.observationDate || new Date(preview.file.lastModified)
                });
                
                console.log('Snag added with observation date:', preview.observationDate || new Date(preview.file.lastModified));
                resolve(null);
              }
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(preview.file);
        });
      }

      // Clean up
      previews.forEach(preview => URL.revokeObjectURL(preview.preview));
      setPreviews([]);
      onUploadComplete();
      setUploadStatus('success');
      
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to upload:', error);
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const removePreview = (index: number) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].preview);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const updateDescription = (index: number, description: string) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      newPreviews[index] = { ...newPreviews[index], description };
      return newPreviews;
    });
  };

  return (
    <div className={`rounded-lg shadow p-4 space-y-3 transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      {/* Project Info */}
      {projectName ? (
        <div className="flex justify-between items-center">
          <div className={`text-sm font-medium transition-colors duration-300 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Adding snags to project: <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{projectName}</span>
          </div>
          <button
            onClick={() => setShowInstructions(true)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Batch Upload Instructions"
          >
            <Info className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="text-sm font-medium text-yellow-600">
          Please select a project from the sidebar to add snags
        </div>
      )}

      {/* Batch Upload Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`relative max-w-md w-full mx-4 p-6 rounded-lg shadow-xl ${
            isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
          }`}>
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Batch Upload Instructions</h3>
            <div className="space-y-3 text-sm">
              <p>To use batch upload:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Create a text file with the same name as your photo (e.g., "photo1.jpg" and "photo1.txt")</li>
                <li>In the text file, add fields in this order (one per line):
                  <ul className="ml-6 mt-1 list-disc">
                    <li>Line 1: Description-YYYY-MM-DD (required, date optional)</li>
                    <li>Line 2: Priority (optional: Low/Medium/High)</li>
                    <li>Line 3: Assigned To (optional)</li>
                    <li>Line 4: Status (optional: In Progress/Completed-YYYY-MM-DD)</li>
                    <li>Line 5: Location (optional)</li>
                  </ul>
                </li>
                <li>If only description is needed, just include one line</li>
                <li>Upload both the photo and text files together</li>
              </ol>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Example text file content:<br />
                Crack in wall near window-2024-03-14<br />
                High<br />
                John Smith<br />
                Completed-2024-03-20<br />
                Building A, Floor 2
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Note: For dates, use YYYY-MM-DD format after a hyphen.<br />
                Examples:<br />
                - Description with date: "Wall needs painting-2024-03-14"<br />
                - Completed status with date: "Completed-2024-03-20"<br />
                If a date format is incorrect, it will be ignored and current date will be used.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-all duration-300 ${
          isDragActive
            ? isDarkMode
              ? 'border-gray-500 bg-gray-700'
              : 'border-gray-400 bg-gray-50'
            : !projectName
              ? isDarkMode
                ? 'border-gray-700 bg-gray-800/50 opacity-50'
                : 'border-gray-200 bg-gray-50 opacity-50'
              : isDarkMode
                ? 'border-gray-600 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : projectName ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <input {...getInputProps()} multiple accept="image/*,text/plain" />
        <div className="space-y-1">
          <div className="flex justify-center space-x-2">
            <Upload className={`w-6 h-6 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <FileText className={`w-6 h-6 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
          </div>
          {!projectName ? (
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Select a project first to upload photos
            </p>
          ) : (
            <>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Drag and drop photos and descriptions.txt here, or click to select
              </p>
              <p className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                You can upload multiple photos with an optional text file containing descriptions
              </p>
            </>
          )}
        </div>
      </div>

      {/* Description File Info */}
      {descriptionFile && (
        <div className={`text-sm transition-colors duration-300 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Description file loaded: {descriptionFile.name}
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {previews.map((preview, index) => (
              <div key={preview.preview} className={`relative border rounded-lg p-2 flex flex-col space-y-2 transition-colors duration-300 ${
                isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200'
              }`}>
                <div className={`relative w-full rounded-lg overflow-hidden transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
                }`}>
                  <div className="aspect-[4/3] relative">
                    <img
                      src={preview.preview}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removePreview(index)}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-300 shadow-sm transform hover:scale-105"
                >
                  <X className="w-3 h-3" />
                </button>
                <textarea
                  value={preview.description}
                  onChange={(e) => updateDescription(index, e.target.value)}
                  placeholder="Add a brief description..."
                  className={`w-full p-1.5 text-sm rounded-lg resize-none transition-all duration-300 focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:ring-gray-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-gray-400'
                  }`}
                  rows={2}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {previews.length} photo{previews.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleUpload}
              disabled={uploading || !projectName}
              className={`px-4 py-1.5 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 text-sm
                ${uploadStatus === 'success' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : uploadStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : isDarkMode
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : 'bg-gray-900 text-white hover:bg-gray-800'} 
                text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {uploadStatus === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Uploaded!</span>
                </>
              ) : uploadStatus === 'error' ? (
                <span>Error - Try Again</span>
              ) : uploading ? (
                <span>Uploading...</span>
              ) : (
                <span>Upload Photos</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 