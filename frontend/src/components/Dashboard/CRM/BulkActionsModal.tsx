import * as React from "react";
import { X, Mail, Calendar, Edit, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applicationsApi } from "@/services/api";

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: string[];
  onSuccess: () => void;
}

type BulkActionType = 'stage' | 'priority' | 'email' | 'schedule';

export function BulkActionsModal({ isOpen, onClose, selectedApplications, onSuccess }: BulkActionsModalProps) {
  const [actionType, setActionType] = React.useState<BulkActionType>('stage');
  const [stage, setStage] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [urgencyReason, setUrgencyReason] = React.useState('');
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setActionType('stage');
      setStage('');
      setPriority('');
      setUrgencyReason('');
      setNote('');
      setResult(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (selectedApplications.length === 0) return;

    setLoading(true);
    setResult(null);

    try {
      let response;
      
      if (actionType === 'stage') {
        if (!stage) {
          setResult({ error: 'Please select a stage' });
          return;
        }
        response = await applicationsApi.bulkMoveStage({
          application_ids: selectedApplications,
          to_stage: stage,
          note: note || `Bulk move to ${stage}`,
        });
      } else if (actionType === 'priority') {
        if (!priority) {
          setResult({ error: 'Please select a priority' });
          return;
        }
        response = await applicationsApi.bulkUpdatePriority({
          application_ids: selectedApplications,
          priority: priority,
          urgency_reason: urgencyReason,
        });
      } else {
        // For email and schedule, we'll just show a placeholder
        setResult({ 
          success: true, 
          message: `${actionType} action would be performed on ${selectedApplications.length} applications` 
        });
        return;
      }

      setResult(response);
      if (response.successful > 0) {
        onSuccess();
      }
    } catch (error) {
      setResult({ 
        error: error instanceof Error ? error.message : 'An error occurred' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bulk Actions</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            {selectedApplications.length} application{selectedApplications.length !== 1 ? 's' : ''} selected
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Action Type Selection */}
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={actionType} onValueChange={(value) => setActionType(value as BulkActionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stage">Move to Stage</SelectItem>
                <SelectItem value="priority">Update Priority</SelectItem>
                <SelectItem value="email">Send Email</SelectItem>
                <SelectItem value="schedule">Schedule Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stage Selection */}
          {actionType === 'stage' && (
            <div className="space-y-2">
              <Label>Target Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enquiry">Enquiry</SelectItem>
                  <SelectItem value="applicant">Application Submitted</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer Made</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority Selection */}
          {actionType === 'priority' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgency Reason (Optional)</Label>
                <Input
                  value={urgencyReason}
                  onChange={(e) => setUrgencyReason(e.target.value)}
                  placeholder="Reason for urgency"
                />
              </div>
            </div>
          )}

          {/* Email/Schedule Placeholder */}
          {(actionType === 'email' || actionType === 'schedule') && (
            <div className="text-center py-8 text-slate-500">
              <div className="flex items-center justify-center gap-2 mb-2">
                {actionType === 'email' ? (
                  <Mail className="h-6 w-6" />
                ) : (
                  <Calendar className="h-6 w-6" />
                )}
                <span className="font-medium">
                  {actionType === 'email' ? 'Email Composer' : 'Meeting Scheduler'}
                </span>
              </div>
              <p className="text-sm">
                This would open the {actionType === 'email' ? 'email composer' : 'meeting scheduler'} 
                {' '}for {selectedApplications.length} applications
              </p>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this bulk action"
              rows={3}
            />
          </div>

          {/* Result Display */}
          {result && (
            <div className={`p-4 rounded-lg ${
              result.error 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.error ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className={`font-medium ${
                  result.error ? 'text-red-700' : 'text-green-700'
                }`}>
                  {result.error ? 'Error' : 'Success'}
                </span>
              </div>
              <p className={`text-sm ${
                result.error ? 'text-red-600' : 'text-green-600'
              }`}>
                {result.error || result.message || 
                  `${result.successful || 0} applications processed successfully`}
              </p>
              {result.failed_items && result.failed_items.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-600">
                    {result.failed} failed: {result.failed_items.map((item: any) => item.error).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedApplications.length === 0}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Execute Action'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
