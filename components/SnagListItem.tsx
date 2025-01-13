import { FC } from 'react';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User,
  MessageSquare,
  Calendar,
  Pencil,
  Trash2,
  Paperclip,
  MapPin
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Snag } from '@/types/snag';
import React from 'react';

interface SnagListItemProps {
  snag: Snag;
  isSelected: boolean;
  onToggleSelect: (snag: Snag) => void;
  onEdit: (snag: Snag) => void;
  onDelete: (id: string) => void;
  onViewAnnotations: (snag: Snag) => void;
  isDarkMode?: boolean;
}

export function SnagListItem({ 
  snag, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onDelete, 
  onViewAnnotations,
  isDarkMode = false 
}: SnagListItemProps) {
  console.log('Snag data:', snag);

  const formattedDate = React.useMemo(() => {
    try {
      return formatDate(snag.createdAt);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }, [snag.createdAt]);

  const priorityColors = getPriorityColor(snag.priority);

  return (
    <Card className="p-4 mb-3 hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
      {snag.status === 'Completed' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="transform rotate-[-30deg] text-green-600/20 dark:text-green-500/20 flex flex-col items-center select-none">
            <span className="text-[72px] font-bold tracking-wider">COMPLETED</span>
            {snag.completionDate && (
              <span className="text-[18px] font-medium -mt-4">
                {formatDate(snag.completionDate)}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex gap-4">
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <div className="flex items-start pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(snag)}
              className="h-4 w-4 border-2 rounded-sm data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors duration-200"
            />
          </div>
        )}

        {/* Image Section */}
        <div className="relative w-[200px] h-[200px] flex-shrink-0">
          <Image
            src={snag.photoPath}
            alt={`Entry #${snag.snagNumber}`}
            className="object-cover w-full h-full rounded-lg border border-gray-200"
            width={200}
            height={200}
            priority
          />
        </div>

        {/* Content Section */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start gap-4 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-semibold truncate ${
                  snag.status === 'Completed' ? 'text-green-600 font-bold' : ''
                }`}>
                  Entry #{snag.snagNumber} - {snag.name || 'Untitled Entry'}
                </h3>
                <Badge variant={getStatusVariant(snag.status)} className="text-xs px-2 py-0.5">
                  {snag.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formattedDate}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {snag.location || 'No location'}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {snag.assignedTo || 'Unassigned'}
                </div>
              </div>
            </div>
            
            {/* Actions Section */}
            <div className="flex gap-1 flex-shrink-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewAnnotations(snag)}
                  className="h-8 w-8"
                  title="View annotations"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                {snag.annotations && snag.annotations.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-xs"
                  >
                    {snag.annotations.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Edit button clicked for snag:', snag.id);
                  onEdit(snag);
                }}
                className="h-8 w-8"
                title="Edit entry"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(snag.id)}
                className="h-8 w-8"
                title="Delete entry"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Description Section */}
            <div className="flex-grow">
              <div className="text-sm font-medium text-gray-500 mb-1.5">Description</div>
              <p className="text-sm text-gray-700 line-clamp-3">{snag.description || 'No description provided'}</p>
            </div>

            {/* Priority Badge */}
            <div className="flex-shrink-0">
              <div className="text-sm font-medium text-gray-500 mb-1.5">Priority</div>
              <Badge 
                style={{
                  backgroundColor: priorityColors.bg,
                  color: priorityColors.color,
                }}
                className="text-xs px-2 py-0.5"
              >
                {snag.priority}
              </Badge>
            </div>
          </div>

          {/* Annotations Section */}
          {snag.annotations && snag.annotations.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-500 mb-2">Annotations</div>
              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2">
                {snag.annotations.map((annotation, index) => (
                  <div key={annotation.id} className="flex items-start gap-2 text-sm bg-gray-50 p-2 rounded-md">
                    <span className="text-gray-400 font-medium">{index + 1}.</span>
                    <span className="line-clamp-2">{annotation.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high': return { color: '#EF4444', bg: '#FEE2E2' };
    case 'medium': return { color: '#F59E0B', bg: '#FEF3C7' };
    case 'low': return { color: '#10B981', bg: '#D1FAE5' };
    default: return { color: '#6B7280', bg: '#F3F4F6' };
  }
};

const getStatusVariant = (status: string): "secondary" | "outline" => {
  switch (status.toLowerCase()) {
    case 'in progress': return 'secondary';
    case 'completed': return 'outline';
    default: return 'secondary';
  }
}; 