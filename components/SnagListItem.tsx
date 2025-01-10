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
    <div className="border-t first:border-t-0 py-6">
      <div className="flex gap-6">
        {/* Image Section */}
        <div className="relative w-[200px] h-[200px] flex-shrink-0">
          <Image
            src={snag.photoPath || '/placeholder-image.jpg'}
            alt={`Snag #${snag.snagNumber}`}
            className="object-cover w-full h-full rounded-lg"
            width={200}
            height={200}
            priority
          />
        </div>

        {/* Content Section */}
        <div className="flex-grow">
          <h3 className="text-lg font-semibold mb-6">Snag #{snag.snagNumber}</h3>

          <div className="grid grid-cols-3 gap-x-8 gap-y-4">
            <div>
              <div className="text-sm text-gray-500">Priority</div>
              <div>{snag.priority}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div>{snag.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Assigned To</div>
              <div>{snag.assignedTo || 'Unassigned'}</div>
            </div>
            <div className="col-span-3">
              <div className="text-sm text-gray-500">Created</div>
              <div>Created {formattedDate}</div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewAnnotations(snag)}
            className="h-8 w-8"
            title="View annotations"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(snag)}
            className="h-8 w-8"
            title="Edit snag"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(snag.id)}
            className="h-8 w-8"
            title="Delete snag"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
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