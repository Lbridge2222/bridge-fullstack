// src/components/EmailHistoryModal.tsx
// Simple modal for viewing email correspondence history

import React, { useState, useEffect } from 'react';
import { Mail, ExternalLink, Clock, Send, Reply, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { aiLeadsApi } from '@/services/api';

interface EmailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName?: string;
}

interface EmailEntry {
  id: number;
  subject: string;
  sent_at: string;
  sent_by: string;
  intent: string;
  status: string;
  created_at: string;
}

const EmailHistoryModal: React.FC<EmailHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  personId, 
  personName 
}) => {
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && personId) {
      fetchEmailHistory();
    }
  }, [isOpen, personId]);

  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await aiLeadsApi.getEmailHistory(personId, 20);
      setEmails(response.email_history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getIntentBadge = (intent: string) => {
    const intentMap = {
      'manual': { color: 'bg-muted text-muted-foreground', label: 'Manual' },
      'ai_generated': { color: 'bg-accent/10 text-accent', label: 'AI Generated' },
      'follow_up': { color: 'bg-success/10 text-success', label: 'Follow-up' },
      'nurture': { color: 'bg-info/10 text-info', label: 'Nurture' }
    };
    
    const config = intentMap[intent as keyof typeof intentMap] || intentMap.manual;
    return <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" />
            Email History
            {personName && (
              <span className="text-muted-foreground font-normal">
                • {personName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading email history...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchEmailHistory}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium mb-1">No emails found</p>
                  <p className="text-xs">Email correspondence will appear here</p>
                </div>
              ) : (
                emails.map((email, index) => (
                  <div key={email.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {email.subject}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            by {email.sent_by}
                          </span>
                          {getIntentBadge(email.intent)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <time className="text-xs text-muted-foreground">
                          {formatDate(email.sent_at)}
                        </time>
                        <div className="flex items-center gap-1 mt-1">
                          <Send className="h-3 w-3 text-success" />
                          <span className="text-xs text-success">Sent</span>
                        </div>
                      </div>
                    </div>
                    
                    {index < emails.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailHistoryModal;
