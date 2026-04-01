import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Archive, Edit2, Trash2 } from 'lucide-react';
import { BatchId } from '@/hooks/useBatchIds';

interface BatchIdCardProps {
  batchId: BatchId;
  departmentName: string;
  onSelect: (batchId: BatchId) => void;
  onEdit: (batchId: BatchId) => void;
  onDelete: (batchId: BatchId) => void;
  onArchive: (batchId: BatchId) => void;
}

export function BatchIdCard({ 
  batchId, 
  departmentName, 
  onSelect, 
  onEdit, 
  onDelete, 
  onArchive 
}: BatchIdCardProps) {
  return (
    <Card 
      className={`group cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
        batchId.is_archived ? 'opacity-60 bg-muted/30' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={() => onSelect(batchId)}>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{batchId.name}</CardTitle>
              {batchId.is_archived && (
                <Badge variant="secondary" className="text-xs">
                  <Archive className="h-3 w-3 mr-1" />
                  Archived
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{departmentName}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onEdit(batchId); }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onArchive(batchId); }}
            >
              <Archive className="h-4 w-4" />
            </Button>
            {!batchId.is_archived && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(batchId); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0" onClick={() => onSelect(batchId)}>
        {batchId.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {batchId.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Click to manage semesters
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}
