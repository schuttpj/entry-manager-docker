import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface ScreenCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

export function ScreenCapture({ onCapture, onCancel, isDarkMode = false }: ScreenCaptureProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = async () => {
    if (!isSelecting || isCapturing) return;
    setIsSelecting(false);

    // Calculate the selection rectangle
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Minimum size check
    if (width < 10 || height < 10) {
      toast.error('Selection area too small');
      onCancel();
      return;
    }

    try {
      setIsCapturing(true);

      // Hide the overlay temporarily for the screenshot
      if (overlayRef.current) {
        overlayRef.current.style.visibility = 'hidden';
      }

      // Create a canvas to capture the screen area
      const canvas = await html2canvas(document.body, {
        x: window.scrollX + x,
        y: window.scrollY + y,
        width,
        height,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        ignoreElements: (element) => {
          // Ignore our own overlay and any other overlays
          return element.classList.contains('screen-capture-overlay');
        }
      });

      // Show the overlay again
      if (overlayRef.current) {
        overlayRef.current.style.visibility = 'visible';
      }

      const imageData = canvas.toDataURL('image/png');
      onCapture(imageData);
    } catch (error) {
      console.error('Screen capture failed:', error);
      toast.error('Failed to capture screen area');
      onCancel();
    } finally {
      setIsCapturing(false);
    }
  };

  const selectionStyle = {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
  };

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-[9999] cursor-crosshair screen-capture-overlay',
        isDarkMode ? 'bg-black/50' : 'bg-white/50'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {isSelecting && (
        <div
          className={cn(
            'absolute border-2 border-blue-500',
            isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'
          )}
          style={selectionStyle}
        />
      )}
      <div className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-lg shadow-lg',
        isDarkMode 
          ? 'bg-gray-800 text-gray-300' 
          : 'bg-white text-gray-700'
      )}>
        {isCapturing ? 'Capturing...' : 'Click and drag to select an area to capture'}
      </div>
    </div>
  );
} 