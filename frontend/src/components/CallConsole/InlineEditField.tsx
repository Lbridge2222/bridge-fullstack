import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

// Types
interface InlineEditFieldProps {
  value: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'phone' | 'date';
  onSave: (value: string) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  disabled?: boolean;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  placeholder,
  type = 'text',
  onSave,
  onCancel,
  className = "",
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleStartEdit = () => {
    if (disabled) return;
    setEditValue(value);
    setIsEditing(true);
    setHasError(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setHasError(false);
    onCancel?.();
  };

  const handleSave = async () => {
    if (editValue.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      await onSave(editValue.trim());
      setIsEditing(false);
      push({
        title: "Updated",
        description: "Field updated successfully",
        variant: "default"
      });
    } catch (error: any) {
      setHasError(true);
      push({
        title: "Update failed",
        description: error.message || "Failed to update field",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // @ts-ignore: TS doesn't know about isComposing on KeyboardEvent
    if ((e as any).isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const formatValue = (val: string) => {
    if (!val) return placeholder || 'Click to edit';
    
    switch (type) {
      case 'phone': {
        // Format as (123) 456-7890, but don't mutate unless it matches expected format
        const cleaned = val.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        return match ? `(${match[1]}) ${match[2]}-${match[3]}` : val; // fallback for short/long numbers
      }
      case 'email':
        return val;
      case 'date': {
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleDateString();
      }
      default:
        return val;
    }
  };

  if (isEditing) {
    return (
      <div className={`group flex items-center gap-2 no-drag ${className}`}>
        <Input
          ref={inputRef}
          type={type === 'phone' ? 'tel' : type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 ${hasError ? 'border-destructive' : ''}`}
          disabled={isLoading}
        />
        <Button
          onClick={handleSave}
          size="sm"
          variant="default"
          disabled={isLoading}
          className="h-8 w-8 p-0"
          aria-label="Save"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          onClick={handleCancel}
          size="sm"
          variant="outline"
          disabled={isLoading}
          className="h-8 w-8 p-0"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-2 no-drag ${className}`}>
      <span 
        className={`flex-1 cursor-pointer hover:text-accent transition-colors ${
          !value ? 'text-muted-foreground' : ''
        }`}
        onClick={handleStartEdit}
        title="Click to edit"
      >
        {formatValue(value)}
      </span>
      {!disabled && (
        <Button
          onClick={handleStartEdit}
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Edit"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
