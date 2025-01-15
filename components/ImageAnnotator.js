import React, { useState, useRef, useEffect } from 'react';

const ImageAnnotator = ({ imageUrl, onSave, onClose, existingAnnotations = [] }) => {
  const [annotations, setAnnotations] = useState([]);
  const [comment, setComment] = useState('');
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinSize, setPinSize] = useState(24);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (existingAnnotations.length > 0) {
      setAnnotations(existingAnnotations);
    }
  }, [existingAnnotations]);

  const toggleAnnotationMode = () => {
    if (!isAnnotationMode && !showInstructions) {
      setShowInstructions(true);
      setTimeout(() => setShowInstructions(false), 5000);
    }
    setIsAnnotationMode(!isAnnotationMode);
  };

  const handleImageClick = (e) => {
    if (!isAnnotationMode || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    console.log('Click coordinates:', { clientX: e.clientX, clientY: e.clientY });
    console.log('Image rect:', rect);
    console.log('Calculated position:', { x, y });

    const newPin = {
      id: Date.now(),
      x,
      y,
      size: pinSize,
      text: '',
    };

    setAnnotations([...annotations, newPin]);
    setSelectedPin(newPin.id);
    setComment('');
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!selectedPin || !comment.trim()) return;

    setAnnotations(annotations.map(pin => 
      pin.id === selectedPin 
        ? { ...pin, text: comment.trim() }
        : pin
    ));
    setComment('');
    setSelectedPin(null);
  };

  const handleSave = () => {
    const annotationsWithComments = annotations.filter(pin => pin.text.trim());
    onSave(annotationsWithComments);
  };

  const deletePin = (id) => {
    setAnnotations(annotations.filter(pin => pin.id !== id));
    if (selectedPin === id) {
      setSelectedPin(null);
      setComment('');
    }
  };

  const adjustPinSize = (increment) => {
    const newSize = Math.max(12, Math.min(48, pinSize + increment));
    setPinSize(newSize);
    if (selectedPin) {
      setAnnotations(annotations.map(pin =>
        pin.id === selectedPin ? { ...pin, size: newSize } : pin
      ));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-[95vw] h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Image Viewer</h2>
            <button
              onClick={toggleAnnotationMode}
              className={`px-3 py-1 rounded-full ${
                isAnnotationMode 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {isAnnotationMode ? '✓ Adding Pins' : '+ Add Pins'}
            </button>
            {isAnnotationMode && (
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
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
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
                  <li>Click "+ Add Pins" to enter annotation mode</li>
                  <li>Click on the image to add pins</li>
                  <li>Use + / - buttons to adjust pin size</li>
                  <li>Click on pins to add/edit comments</li>
                  <li>Click Save when finished</li>
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

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div ref={containerRef} className="flex-1 relative bg-gray-100 rounded flex items-center justify-center overflow-hidden">
            <div className="relative inline-block">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Annotate"
                className={`max-w-full max-h-[75vh] object-contain ${isAnnotationMode ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleImageClick}
                style={{ display: 'block' }}
              />
              <div className="absolute inset-0 pointer-events-none">
                {annotations.map((pin, index) => (
                  <div
                    key={pin.id}
                    className={`absolute rounded-full cursor-pointer transition-all z-10
                      ${selectedPin === pin.id ? 'bg-blue-500' : 'bg-red-500'} 
                      hover:bg-blue-600 flex items-center justify-center text-white`}
                    style={{ 
                      left: `${pin.x}%`, 
                      top: `${pin.y}%`,
                      width: `${pin.size || pinSize}px`,
                      height: `${pin.size || pinSize}px`,
                      marginLeft: `-${(pin.size || pinSize) / 2}px`,
                      marginTop: `-${(pin.size || pinSize) / 2}px`,
                      fontSize: `${(pin.size || pinSize) * 0.5}px`,
                      pointerEvents: 'auto'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPin(pin.id);
                      setComment(pin.text);
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-80 bg-gray-50 rounded p-4 overflow-auto">
            <h3 className="font-semibold mb-4">Annotations</h3>
            {annotations.length === 0 ? (
              <p className="text-gray-500">
                {isAnnotationMode 
                  ? 'Click on the image to add pins' 
                  : 'Click the "+ Add Pins" button to start annotating'}
              </p>
            ) : (
              <div className="space-y-4">
                {annotations.map((pin, index) => (
                  <div 
                    key={pin.id} 
                    className={`p-3 rounded border relative ${selectedPin === pin.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    onMouseEnter={() => setHoveredComment(pin.id)}
                    onMouseLeave={() => setHoveredComment(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Pin {index + 1}</span>
                      {(hoveredComment === pin.id || selectedPin === pin.id) && (
                        <button
                          onClick={() => deletePin(pin.id)}
                          className="text-red-500 hover:text-red-600 transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {selectedPin === pin.id ? (
                      <form onSubmit={handleCommentSubmit}>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="w-full p-2 border rounded"
                          rows="3"
                          placeholder="Add a comment..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            type="submit"
                            className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Save Comment
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPin(null);
                              setComment('');
                            }}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-gray-700">
                          {pin.text || 'No comment added'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedPin(pin.id);
                              setComment(pin.text);
                            }}
                            className="text-sm text-blue-500 hover:text-blue-600"
                          >
                            Edit Comment
                          </button>
                          {(hoveredComment === pin.id || selectedPin === pin.id) && (
                            <button
                              onClick={() => deletePin(pin.id)}
                              className="text-sm text-red-500 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnnotator; 