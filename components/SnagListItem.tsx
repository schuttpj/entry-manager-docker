import { FC } from 'react';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  User,
  MessageSquare,
  Calendar,
  Pencil,
  Trash2,
  Paperclip
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Snag } from '@/types';
import React from 'react';

interface SnagListItemProps {
  snag: Snag;
  onEdit: (snag: Snag) => void;
  onDelete: (id: string) => void;
  onViewAnnotations: (snag: Snag) => void;
}

export const SnagListItem: FC<SnagListItemProps> = ({
  snag,
  onEdit,
  onDelete,
  onViewAnnotations
}) => {
  console.log('Snag data:', snag);

  const formattedDate = React.useMemo(() => {
    try {
      return formatDate(snag.createdAt);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }, [snag.createdAt]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4" 
          style={{ borderLeftColor: getPriorityColor(snag.priority).color }}>
      <div className="flex p-6 gap-8">
        {/* Left: Image Section */}
        <div className="relative w-[400px] h-[300px] flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={snag.photoPath || '/placeholder-image.jpg'}
              alt={`Snag #${snag.snagNumber}`}
              className="object-contain w-full h-full hover:scale-105 transition-transform duration-300 ease-out"
              width={400}
              height={300}
              priority
            />
          </div>
          {/* Overlay Header with Snag Number */}
          <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-white text-lg font-medium px-3 py-1.5 rounded">
                #{snag.snagNumber}
              </span>
              {snag.annotations.length > 0 && (
                <div className="bg-blue-500/90 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  {snag.annotations.length}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Content Section */}
        <div className="flex-grow space-y-4 py-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold flex-grow">{snag.description}</h3>
            <Badge variant={getStatusVariant(snag.status)} className="text-sm px-3 py-1">
              {snag.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-6 text-base text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span>{snag.assignedTo || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{formattedDate}</span>
            </div>
            {snag.annotations.map((pin, index) => (
              <div key={index} className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <MessageSquare className="w-5 h-5" />
                <span>Pin {index + 1}: {pin.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions Section */}
        <div className="flex flex-col gap-3 justify-start">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
            onClick={() => onEdit(snag)}
            title="Edit snag"
          >
            <Pencil className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
            onClick={() => onViewAnnotations(snag)}
            title="View annotations"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all"
            onClick={() => onDelete(snag.id)}
            title="Delete snag"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high': return { color: '#EF4444', bg: '#FEE2E2' };
    case 'medium': return { color: '#F59E0B', bg: '#FEF3C7' };
    case 'low': return { color: '#10B981', bg: '#D1FAE5' };
    default: return { color: '#6B7280', bg: '#F3F4F6' };
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "success" => {
  switch (status.toLowerCase()) {
    case 'open': return 'default';
    case 'in progress': return 'secondary';
    case 'completed': return 'success';
    default: return 'default';
  }
}; 