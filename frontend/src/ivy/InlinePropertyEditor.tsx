/**
 * Inline Property Editor Component
 * Allows editing person properties without opening modals
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { X, Save, Calendar, Phone, Mail, User, GraduationCap } from 'lucide-react';

interface PropertyField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select';
  value: string;
  icon?: React.ReactNode;
  options?: string[];
}

interface InlinePropertyEditorProps {
  person: any;
  onSave: (field: string, value: string) => void;
  onCancel: () => void;
  isVisible: boolean;
  prefillField?: string;
  prefillValue?: string;
}

export const InlinePropertyEditor: React.FC<InlinePropertyEditorProps> = ({
  person,
  onSave,
  onCancel,
  isVisible,
  prefillField,
  prefillValue
}) => {
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');

  const fields: PropertyField[] = [
    {
      key: 'first_name',
      label: 'First Name',
      type: 'text',
      value: person?.first_name || '',
      icon: <User className="h-4 w-4" />
    },
    {
      key: 'last_name',
      label: 'Last Name',
      type: 'text',
      value: person?.last_name || '',
      icon: <User className="h-4 w-4" />
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      value: person?.email || '',
      icon: <Mail className="h-4 w-4" />
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'phone',
      value: person?.phone || '',
      icon: <Phone className="h-4 w-4" />
    },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      type: 'date',
      value: person?.date_of_birth || '',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      key: 'nationality',
      label: 'Nationality',
      type: 'text',
      value: person?.nationality || '',
      icon: <GraduationCap className="h-4 w-4" />
    }
  ];

  // Auto-start editing if prefill field is specified
  React.useEffect(() => {
    if (isVisible && prefillField && !editingField) {
      const field = fields.find(f => f.key === prefillField);
      if (field) {
        setEditingField(prefillField);
        setEditValue(prefillValue || field.value);
      }
    }
  }, [isVisible, prefillField, prefillValue, editingField, fields]);

  if (!isVisible) return null;

  const handleEdit = (field: PropertyField) => {
    setEditingField(field.key);
    setEditValue(field.value);
  };

  const handleSave = () => {
    if (editingField && editValue !== fields.find(f => f.key === editingField)?.value) {
      onSave(editingField, editValue);
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Card className="p-4 bg-white border border-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Edit Properties</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-[120px]">
              {field.icon}
              <Label className="text-sm font-medium text-muted-foreground">
                {field.label}:
              </Label>
            </div>
            
            {editingField === field.key ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type={field.type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-8 px-2"
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="h-8 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-foreground flex-1">
                  {field.value || <span className="text-muted-foreground italic">Not set</span>}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(field)}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 Tip: Click "Edit" next to any field to update it inline. Press Enter to save, Escape to cancel.
        </p>
      </div>
    </Card>
  );
};
