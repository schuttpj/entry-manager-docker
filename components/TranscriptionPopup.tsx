import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon as XIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Props {
  onClose: () => void;
  transcription: string;
  summary?: string;
}

interface SummaryEntry {
  entry: string;
  priority?: string;
  description: string;
}

const TranscriptionPopup = ({ onClose, transcription, summary }: Props) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'raw'>('summary');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 200 });
  const popupRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!popupRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // Ensure the modal stays within viewport bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.min(Math.max(0, newX), maxX),
        y: Math.min(Math.max(0, newY), maxY)
      });
    };

    const handleMouseUp = () => {
      setIsDragging(true);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, size.width, size.height]);

  const parseSummaryEntries = (text: string): SummaryEntry[] => {
    const entries: SummaryEntry[] = [];
    const lines = text.split('\n');
    let currentEntry: Partial<SummaryEntry> = {};

    lines.forEach(line => {
      if (line.startsWith('Entry #')) {
        if (Object.keys(currentEntry).length > 0) {
          entries.push(currentEntry as SummaryEntry);
        }
        currentEntry = { entry: line.trim() };
      } else if (line.startsWith('Priority:')) {
        currentEntry.priority = line.replace('Priority:', '').trim();
      } else if (line.startsWith('Description:')) {
        currentEntry.description = line.replace('Description:', '').trim();
      }
    });

    if (Object.keys(currentEntry).length > 0) {
      entries.push(currentEntry as SummaryEntry);
    }

    return entries;
  };

  return (
    <div
      ref={popupRef}
      className="fixed bg-white rounded-lg shadow-lg overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: size.width,
        height: size.height,
        minWidth: 300,
        minHeight: 200,
        resize: 'both',
        cursor: isResizing ? 'nwse-resize' : 'auto'
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Voice Note</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex space-x-2 p-4 border-b">
          <button
            className={`px-4 py-2 rounded ${
              activeTab === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`px-4 py-2 rounded ${
              activeTab === 'raw' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setActiveTab('raw')}
          >
            Raw Transcription
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
          {activeTab === 'summary' && summary ? (
            <div className="space-y-4">
              {parseSummaryEntries(summary).map((entry, index) => (
                <div key={index} className="border rounded p-3 hover:bg-gray-50">
                  <button
                    className="w-full text-left flex justify-between items-center"
                    onClick={() => setExpandedEntry(expandedEntry === entry.entry ? null : entry.entry)}
                  >
                    <span className="font-semibold">{entry.entry}</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transform transition-transform ${
                        expandedEntry === entry.entry ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedEntry === entry.entry && (
                    <div className="mt-2 pl-4 border-l-2 border-blue-200">
                      {entry.priority && (
                        <p className="text-gray-700">Priority: {entry.priority}</p>
                      )}
                      {entry.description && (
                        <p className="text-gray-700">Description: {entry.description}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap">{transcription}</pre>
          )}
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 bg-gray-400 rounded-sm" />
        </div>
      </div>
    </div>
  );
};

export default TranscriptionPopup; 