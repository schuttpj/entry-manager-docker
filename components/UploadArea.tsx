import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check } from 'lucide-react';
import { addSnag } from '@/lib/db';
import { compressImage } from '@/lib/utils';

interface UploadAreaProps {
  projectName: string;
  onUploadComplete: () => void;
  isDarkMode?: boolean;
}

export function UploadArea({ 
  projectName, 
  onUploadComplete,
  isDarkMode = false 
}: UploadAreaProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Array<{ file: File; preview: string; description: string }>>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newPreviews = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      description: ''
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
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
                // Compress the image before storing
                const compressedImage = await compressImage(reader.result, {
                  maxWidth: 1920,  // Limit max width to 1920px
                  quality: 0.8,    // 80% quality
                  maxSizeMB: 2     // Limit file size to 2MB
                });
                
                await addSnag({
                  projectName,
                  description: preview.description,
                  photoPath: compressedImage,
                  priority: 'Medium',
                  assignedTo: '',
                  status: 'In Progress'
                });
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
      
      // Reset status after 3 seconds
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
        <div className={`text-sm font-medium transition-colors duration-300 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        }`}>
          Adding snags to project: <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{projectName}</span>
        </div>
      ) : (
        <div className="text-sm font-medium text-yellow-600">
          Please select a project from the sidebar to add snags
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
        <input {...getInputProps()} multiple />
        <div className="space-y-1">
          <Upload className={`w-6 h-6 mx-auto transition-colors duration-300 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          {!projectName ? (
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Select a project first to upload photos
            </p>
          ) : (
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Drag and drop photos here, or click to select
            </p>
          )}
        </div>
      </div>

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