import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Copy, 
  Plus, 
  Send,
  FileText
} from "lucide-react";

// Types
interface TranscriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transcriptWindow: string[];
  onSelection?: (text: string) => void;
}

const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  isOpen,
  onClose,
  transcriptWindow,
  onSelection
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      
      // Calculate position in transcript
      const range = selection.getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(transcriptRef.current!);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;
      const end = start + text.length;
      
      setSelectionStart(start);
      setSelectionEnd(end);
    } else {
      setSelectedText("");
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // Handle copy selection
  const handleCopySelection = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
    }
  };

  // Handle send to omnibox
  const handleSendToOmnibox = () => {
    if (selectedText && onSelection) {
      onSelection(selectedText);
      onClose();
    }
  };

  // Filter transcript based on search
  const filteredTranscript = transcriptWindow.filter(chunk => 
    chunk.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format transcript chunks with timestamps
  const formatTranscript = (chunks: string[]) => {
    return chunks.map((chunk, index) => {
      const timestamp = new Date(Date.now() - (chunks.length - index) * 5000).toLocaleTimeString();
      return {
        id: index,
        timestamp,
        text: chunk
      };
    });
  };

  const transcriptEntries = formatTranscript(filteredTranscript);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Call Transcript
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search transcript..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Selection Actions */}
          {selectedText && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
              <div className="text-xs font-medium text-accent mb-2">Selected Text</div>
              <div className="text-sm text-foreground mb-3 p-2 bg-white rounded border">
                "{selectedText}"
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopySelection}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  onClick={handleSendToOmnibox}
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send to AI
                </Button>
              </div>
            </div>
          )}

          {/* Transcript Content */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transcript</span>
                <Badge variant="outline" className="text-xs">
                  {transcriptEntries.length} entries
                </Badge>
              </div>
            </div>
            
            <div 
              ref={transcriptRef}
              className="max-h-[60vh] overflow-y-auto p-3 space-y-3"
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
            >
              {transcriptEntries.length > 0 ? (
                transcriptEntries.map((entry) => (
                  <div key={entry.id} className="p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.timestamp}
                      </Badge>
                      <span className="text-xs text-slate-500">Speaker</span>
                    </div>
                    <p className="text-sm text-slate-700 select-text">
                      {entry.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No transcript available yet</p>
                  <p className="text-xs mt-1">Start recording to see live transcript</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
            <div className="font-medium mb-1">How to use:</div>
            <ul className="space-y-1 text-xs">
              <li>• Select text to copy or send to AI assistant</li>
              <li>• Use search to find specific parts of the conversation</li>
              <li>• Click "Send to AI" to generate objection handling</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TranscriptDrawer;
