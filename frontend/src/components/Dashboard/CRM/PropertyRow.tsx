import React, { useState } from 'react';
import { Edit3, History, Copy, Check, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PropertyRowProps {
  id: string;
  label: string;
  value: string | null;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'multi-select' | 'number';
  source: 'HS' | 'SYS' | 'USR';
  hasHistory: boolean;
  lastChangedAt?: string;
  lastChangedBy?: string;
  onSave: (value: string) => void;
  onHistoryClick: () => void;
  options?: string[]; // For select/multi-select types
}

const PropertyRow: React.FC<PropertyRowProps> = ({
  id,
  label,
  value,
  type,
  source,
  hasHistory,
  lastChangedAt,
  lastChangedBy,
  onSave,
  onHistoryClick,
  options = []
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'HS': return 'bg-blue-100 text-blue-800';
      case 'SYS': return 'bg-gray-100 text-gray-800';
      case 'USR': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-sm"
          />
        );
      case 'number':
        return (
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-sm"
          />
        );
      default:
        return (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-sm"
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        );
    }
  };

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'email' || type === 'phone' || type === 'number') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  if (isEditing) {
    return (
      <div className="space-y-2 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Badge className={`text-xs ${getSourceColor(source)}`}>{source}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {renderInput()}
          <Button size="sm" onClick={handleSave} className="h-8 px-2">
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 px-2">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
      {/* Line 1: Label + Source Badge */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Badge className={`text-xs ${getSourceColor(source)}`}>{source}</Badge>
      </div>
      
      {/* Line 2: Value + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {value ? (
            <span className="text-sm text-foreground break-words">{value}</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground italic">Not set</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditing(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Action Icons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          {value && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit {label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {hasHistory && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={onHistoryClick}
                  >
                    <History className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View history</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {value && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to clipboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Last Changed Info */}
      {lastChangedAt && lastChangedBy && (
        <div className="text-xs text-muted-foreground/70 mt-1">
          Changed {lastChangedAt} by {lastChangedBy}
        </div>
      )}
    </div>
  );
};

export default PropertyRow;
