import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Annotation } from '../types/snag';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface ImageAnnotatorProps {
  imageUrl: string;
  existingAnnotations: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  onClose: () => void;
}

export default function ImageAnnotator({ imageUrl, existingAnnotations = [], onSave, onClose }: ImageAnnotatorProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [pinSize, setPinSize] = useState(24);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAddingAnnotation) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      x,
      y,
      text: '',
      size: pinSize
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotation(newAnnotation.id);
    setComment('');
  };

  const handleCommentSave = () => {
    if (!selectedAnnotation) return;

    setAnnotations(prev => prev.map(ann => 
      ann.id === selectedAnnotation 
        ? { ...ann, text: comment }
        : ann
    ));
    setSelectedAnnotation(null);
    setComment('');
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
      setComment('');
    }
  };

  const adjustPinSize = (delta: number) => {
    setPinSize(prev => Math.max(12, Math.min(48, prev + delta)));
  };

  const handleSave = () => {
    console.log('Saving annotations:', annotations);
    // Filter out annotations without text before saving
    const validAnnotations = annotations.filter(ann => ann.text?.trim());
    console.log('Valid annotations to save:', validAnnotations);
    onSave(validAnnotations);
    toast.success('Annotations saved successfully');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnotation || !comment.trim()) return;

    console.log('Saving comment for pin:', selectedAnnotation);
    setAnnotations(annotations.map(pin => 
      pin.id === selectedAnnotation 
        ? { ...pin, text: comment.trim() }
        : pin
    ));
    setComment('');
    setSelectedAnnotation(null);
    // Trigger save after updating the annotation
    handleSave();
  };

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>

        <div className="relative">
          <Image
            ref={imageRef}
            src={imageUrl}
            alt="Annotated image"
            width={800}
            height={600}
            className="max-w-full h-auto rounded-lg cursor-crosshair"
            onClick={handleImageClick}
            priority
          />
          
          {/* Annotation Pins */}
          {annotations.map((pin, index) => (
            <div
              key={pin.id}
              className="absolute"
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Pin */}
              <div
                className={`relative flex items-center justify-center rounded-full bg-red-500 text-white cursor-pointer transition-transform hover:scale-110 ${
                  selectedAnnotation === pin.id ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  width: `${pin.size || 24}px`,
                  height: `${pin.size || 24}px`,
                }}
                onClick={() => {
                  setSelectedAnnotation(pin.id);
                  setComment(pin.text || '');
                }}
              >
                {index + 1}
              </div>

              {/* Comment Popup */}
              {selectedAnnotation === pin.id && (
                <div className="absolute z-10 bg-white rounded-lg shadow-lg p-4 min-w-[200px] transform -translate-x-1/2 mt-2">
                  <Label htmlFor="comment">Comment</Label>
                  <Input
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mt-1"
                    placeholder="Add a comment..."
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" onClick={() => setSelectedAnnotation(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCommentSave}>
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Hover Preview */}
              {!selectedAnnotation && pin.text && (
                <div className="absolute z-10 bg-white rounded-lg shadow-lg p-2 min-w-[150px] transform -translate-x-1/2 mt-2 text-sm">
                  {pin.text}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Annotations List */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Annotations</h3>
          <div className="space-y-2">
            {annotations.map((pin, index) => (
              <div
                key={pin.id}
                className="flex items-start gap-2 p-2 rounded hover:bg-gray-50"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="flex-grow">
                  <p className="text-gray-700">
                    {pin.text || 'No comment added'}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => {
                        setSelectedAnnotation(pin.id);
                        setComment(pin.text || '');
                      }}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAnnotation(pin.id)}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 