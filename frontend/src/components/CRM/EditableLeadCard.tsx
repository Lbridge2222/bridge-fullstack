import React, { useState, useCallback } from 'react';
import type { PersonEnriched } from '@/services/api';
import { useLeadUpdates } from '../../hooks/useLeadUpdates';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EditableLeadCardProps {
  lead: PersonEnriched;
  onUpdate?: (updatedLead: PersonEnriched) => void;
  onRefresh?: () => void;
}

export const EditableLeadCard: React.FC<EditableLeadCardProps> = ({
  lead,
  onUpdate,
  onRefresh
}) => {
  const { updateLead, updatePerson, addLeadNote, isUpdating, error } = useLeadUpdates();
  
  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<Partial<PersonEnriched>>({});
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof PersonEnriched, value: any) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save person updates
  const handleSavePerson = useCallback(async () => {
    try {
      const result = await updatePerson(lead.id, editingData);
      setIsEditing(false);
      setEditingData({});
      onUpdate?.({ ...lead, ...editingData });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update person:', err);
    }
  }, [lead.id, editingData, updatePerson, onUpdate, onRefresh]);

  // Save lead updates
  const handleSaveLead = useCallback(async () => {
    try {
      const result = await updateLead(lead.id, editingData);
      setIsEditing(false);
      setEditingData({});
      onUpdate?.({ ...lead, ...editingData });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }, [lead.id, editingData, updateLead, onUpdate, onRefresh]);

  // Add note
  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return;
    
    try {
      await addLeadNote(lead.id, { note: newNote.trim() });
      setNewNote('');
      setShowNoteInput(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  }, [lead.id, newNote, addLeadNote, onRefresh]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditingData({});
    setShowNoteInput(false);
    setNewNote('');
  }, []);

  // Start editing
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditingData({});
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={editingData.first_name || lead.first_name || ''}
                  onChange={(e) => handleFieldChange('first_name', e.target.value)}
                  placeholder="First Name"
                  className="w-24"
                />
                <Input
                  value={editingData.last_name || lead.last_name || ''}
                  onChange={(e) => handleFieldChange('last_name', e.target.value)}
                  placeholder="Last Name"
                  className="w-24"
                />
              </div>
            ) : (
              `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed Lead'
            )}
          </CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSavePerson} disabled={isUpdating}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleEdit}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">Email</Label>
            {isEditing ? (
              <Input
                value={editingData.email || lead.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="Email"
                className="mt-1"
              />
            ) : (
              <p className="text-sm mt-1">{lead.email || 'No email'}</p>
            )}
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-600">Phone</Label>
            {isEditing ? (
              <Input
                value={editingData.phone || lead.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="Phone"
                className="mt-1"
              />
            ) : (
              <p className="text-sm mt-1">{lead.phone || 'No phone'}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Lead Management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-600">Lead Score</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                max="100"
                value={editingData.lead_score || lead.lead_score || 0}
                onChange={(e) => handleFieldChange('lead_score', parseInt(e.target.value) || 0)}
                className="w-20"
              />
            ) : (
              <Badge variant="secondary">{lead.lead_score || 0}</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-600">Conversion Probability</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={editingData.conversion_probability || lead.conversion_probability || 0}
                onChange={(e) => handleFieldChange('conversion_probability', parseFloat(e.target.value) || 0)}
                className="w-20"
              />
            ) : (
              <Badge variant="outline">
                {((lead.conversion_probability || 0) * 100).toFixed(1)}%
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-600">Status</Label>
            {isEditing ? (
              <Select
                value={editingData.status || lead.status || 'new'}
                onValueChange={(value) => handleFieldChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="default">{lead.status || 'new'}</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Notes Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-600">Notes</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNoteInput(!showNoteInput)}
            >
              {showNoteInput ? 'Cancel' : 'Add Note'}
            </Button>
          </div>
          
          {showNoteInput && (
            <div className="space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this lead..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || isUpdating}>
                  Save Note
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNoteInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isUpdating && (
          <div className="text-gray-600 text-sm text-center">
            Updating...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
