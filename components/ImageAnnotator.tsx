import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Annotation } from '../types/snag';

interface ImageAnnotatorProps {
  imageUrl: string;
  existingAnnotations: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  onClose: () => void;
}

export default function ImageAnnotator({ imageUrl, existingAnnotations, onSave, onClose }: ImageAnnotatorProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [pinSize, setPinSize] = useState(24);
  const [showInstructions, setShowInstructions] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAddingAnnotation && !showInstructions) {
      setShowInstructions(true);
      const timer = setTimeout(() => setShowInstructions(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isAddingAnnotation]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingAnnotation || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      x,
      y,
      text: '',
      size: pinSize,
    };

    setAnnotations([...annotations, newAnnotation]);
    setSelectedAnnotation(newAnnotation);
    setIsAddingAnnotation(false);
  };

  const handleAnnotationTextChange = (id: string, text: string) => {
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, text } : ann
    ));
  };

  const handleAnnotationDelete = (id: string) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
    setSelectedAnnotation(null);
  };

  const adjustPinSize = (increment: number) => {
    const newSize = Math.max(12, Math.min(48, pinSize + increment));
    setPinSize(newSize);
    if (selectedAnnotation) {
      setAnnotations(annotations.map(ann =>
        ann.id === selectedAnnotation.id ? { ...ann, size: newSize } : ann
      ));
    }
  };

  const handleSave = () => {
    // Filter out any invalid annotations and ensure text is handled safely
    const validAnnotations = annotations.filter(ann => (
      typeof ann === 'object' &&
      ann !== null &&
      typeof ann.x === 'number' &&
      typeof ann.y === 'number'
    )).map(ann => ({
      ...ann,
      text: typeof ann.text === 'string' ? ann.text : ''
    }));
    
    onSave(validAnnotations);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAnnotation(null);
        setIsAddingAnnotation(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Edit Annotations</h2>
            <button
              onClick={() => {
                setIsAddingAnnotation(!isAddingAnnotation);
                setSelectedAnnotation(null);
              }}
              className={`px-4 py-2 rounded ${
                isAddingAnnotation
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {isAddingAnnotation ? '✓ Adding Pins' : '+ Add Pins'}
            </button>
            {isAddingAnnotation && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustPinSize(-4)}
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  -
                </button>
                <span className="text-sm">Pin Size</span>
                <button
                  onClick={() => adjustPinSize(4)}
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  +
                </button>
              </div>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>

        {showInstructions && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-lg z-50 max-w-md">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-800">Quick Guide:</h3>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>Click on the image to add pins</li>
                  <li>Use + / - buttons to adjust pin size</li>
                  <li>Click on pins to add/edit comments</li>
                  <li>Click Save Changes when finished</li>
                </ul>
              </div>
              <button 
                onClick={() => setShowInstructions(false)}
                className="text-blue-500 hover:text-blue-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <div
              ref={imageRef}
              className="relative aspect-video"
              onClick={handleImageClick}
            >
              <Image
                src={imageUrl}
                alt="Annotatable image"
                fill
                className={`object-contain ${isAddingAnnotation ? 'cursor-crosshair' : 'cursor-default'}`}
                sizes="(max-width: 768px) 100vw, 42rem"
              />
              {annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className={`absolute flex items-center justify-center text-white text-sm cursor-pointer transition-all
                    ${selectedAnnotation?.id === annotation.id ? 'bg-blue-500' : 'bg-red-500'} rounded-full`}
                  style={{
                    left: `${annotation.x}%`,
                    top: `${annotation.y}%`,
                    width: `${annotation.size || pinSize}px`,
                    height: `${annotation.size || pinSize}px`,
                    marginLeft: `-${(annotation.size || pinSize) / 2}px`,
                    marginTop: `-${(annotation.size || pinSize) / 2}px`,
                    fontSize: `${(annotation.size || pinSize) * 0.5}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotation(annotation);
                    setIsAddingAnnotation(false);
                  }}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="w-80">
            <h3 className="font-semibold mb-2">Annotations</h3>
            <div className="space-y-4">
              {annotations.length === 0 ? (
                <p className="text-gray-500">
                  {isAddingAnnotation 
                    ? 'Click on the image to add pins' 
                    : 'Click the "+ Add Pins" button to start annotating'}
                </p>
              ) : (
                annotations.map((annotation, index) => (
                  <div
                    key={annotation.id}
                    className={`p-4 rounded border ${
                      selectedAnnotation?.id === annotation.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-sm">
                        {index + 1}
                      </span>
                      <button
                        onClick={() => handleAnnotationDelete(annotation.id)}
                        className="text-red-500 hover:text-red-700 ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                    <textarea
                      value={annotation.text}
                      onChange={(e) => handleAnnotationTextChange(annotation.id, e.target.value)}
                      placeholder="Enter annotation text..."
                      className="w-full p-2 border rounded resize-none"
                      rows={3}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 