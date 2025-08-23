import React from 'react';
import { X, Calendar, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface PropertyChange {
  id: string;
  timestamp: string;
  value: string;
  changedBy: string;
  changeType: 'created' | 'updated' | 'deleted';
}

interface PropertyHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  propertyLabel: string;
  currentValue: string | null;
  changes: PropertyChange[];
}

const PropertyHistoryDrawer: React.FC<PropertyHistoryDrawerProps> = ({
  isOpen,
  onClose,
  propertyLabel,
  currentValue,
  changes
}) => {
  if (!isOpen) return null;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative ml-auto h-full w-full max-w-md bg-background border-l shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Property History</h3>
            <p className="text-sm text-muted-foreground">{propertyLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-4">
            {/* Current Value */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Current Value</h4>
              <div className="p-3 bg-muted rounded-md">
                {currentValue ? (
                  <span className="text-sm text-foreground">{currentValue}</span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Not set</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Change History */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Change History</h4>
              
              {changes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No changes recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {changes.map((change, index) => (
                    <div key={change.id} className="space-y-2">
                      {/* Change Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getChangeTypeColor(change.changeType)}`}>
                            {change.changeType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(change.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {change.changedBy}
                        </div>
                      </div>
                      
                      {/* Change Value */}
                      <div className="p-2 bg-muted/50 rounded border-l-2 border-muted-foreground/20">
                        <span className="text-sm text-foreground">{change.value}</span>
                      </div>
                      
                      {/* Arrow to next change */}
                      {index < changes.length - 1 && (
                        <div className="flex justify-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PropertyHistoryDrawer;
