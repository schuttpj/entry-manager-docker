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
  Paperclip
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Snag } from '@/types/snag';
import React from 'react';

interface SnagListItemProps {
  snag: Snag;
  onEdit: (snag: Snag) => void;
  onDelete: (id: string) => void;
  onViewAnnotations: (snag: Snag) => void;
  isSelected?: boolean;
  onToggleSelect?: (snag: Snag) => void;
}

export const SnagListItem: FC<SnagListItemProps> = ({
  snag,
  onEdit,
  onDelete,
  onViewAnnotations,
  isSelected = false,
  onToggleSelect
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

  const priorityColors = getPriorityColor(snag.priority);

  return (
    <Card className="p-6 mb-4 hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
      {snag.status === 'Completed' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="transform rotate-[-30deg] text-green-600/25 dark:text-green-500/25 flex flex-col items-center select-none">
            <span className="text-[120px] font-bold tracking-wider">COMPLETED</span>
            {snag.completionDate && (
              <span className="text-[30px] font-medium -mt-8">
                {formatDate(snag.completionDate)}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex gap-8">
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <div className="flex items-start pt-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(snag)}
              className="h-5 w-5 border-2 rounded-sm data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors duration-200"
            />
          </div>
        )}

        {/* Image Section */}
        <div className="relative w-[240px] h-[240px] flex-shrink-0">
          <Image
            src={snag.photoPath}
            alt={`Snag #${snag.snagNumber}`}
            className="object-cover w-full h-full rounded-lg border border-gray-200"
            width={240}
            height={240}
            priority
          />
        </div>

        {/* Content Section */}
        <div className="flex-grow space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-xl font-semibold ${
                snag.status === 'Completed' ? 'text-green-600 font-bold' : ''
              }`}>
                Snag #{snag.snagNumber}
                {snag.status === 'Completed' && snag.completionDate && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    Completed: {formatDate(snag.completionDate)}
                  </span>
                )}
                {snag.status === 'Completed' && !snag.completionDate && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    Completion Date: Not Updated yet
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Created {formattedDate}</p>
              <p className="text-base text-gray-700 mt-2">{snag.name || 'Untitled Snag'}</p>
            </div>
            
            {/* Actions Section */}
            <div className="flex gap-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewAnnotations(snag)}
                  className="h-9 w-9"
                  title="View annotations"
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
                {snag.annotations && snag.annotations.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {snag.annotations.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(snag)}
                className="h-9 w-9"
                title="Edit snag"
              >
                <Pencil className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(snag.id)}
                className="h-9 w-9"
                title="Delete snag"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Description Section */}
            <div className="flex-grow">
              <div className="text-sm font-medium text-gray-500 mb-2">Description</div>
              <p className="text-sm text-gray-700">{snag.description || 'No description provided'}</p>
            </div>

            {/* Metadata Section - Stacked vertically */}
            <div className="w-48 space-y-4">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-500">Priority</div>
                <Badge 
                  style={{
                    backgroundColor: priorityColors.bg,
                    color: priorityColors.color,
                  }}
                  className="text-sm px-3 py-1"
                >
                  {snag.priority}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-500">Status</div>
                <Badge variant={getStatusVariant(snag.status)} className="text-sm px-3 py-1">
                  {snag.status}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-500">Assigned To</div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{snag.assignedTo || 'Unassigned'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Annotations Section */}
          {snag.annotations && snag.annotations.length > 0 && (
            <div className="pt-4">
              <div className="text-sm font-medium text-gray-500 mb-3">Annotations</div>
              <div className="space-y-3 max-h-[120px] overflow-y-auto pr-4">
                {snag.annotations.map((annotation, index) => (
                  <div key={annotation.id} className="flex items-start gap-3 text-sm bg-gray-50 p-3 rounded-md">
                    <span className="text-gray-400 font-medium">{index + 1}.</span>
                    <span>{annotation.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

const getStatusVariant = (status: string): "secondary" | "outline" => {
  switch (status.toLowerCase()) {
    case 'in progress': return 'secondary';
    case 'completed': return 'outline';
    default: return 'secondary';
  }
}; 