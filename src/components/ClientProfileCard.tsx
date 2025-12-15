import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Phone, Mail, MapPin, Calendar, AlertTriangle, Plus, User } from "lucide-react";
import { format } from "date-fns";

interface ClaimNote {
  id: string;
  claim_id: string;
  note: string;
  created_at: string;
}

interface Claim {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  accident_date: string;
  injury_area: string;
  at_fault: string;
  status: string;
  notes: string | null;
  agreement_amount: number | null;
  created_at: string;
  updated_at: string;
}

interface ClientProfileCardProps {
  claim: Claim;
  notes: ClaimNote[];
  onStatusChange: (claimId: string, newStatus: string) => void;
  onAddNote: (claimId: string, note: string) => void;
  onExpand: (claimId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "new": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "in_progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "pending": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "new": return "Chase";
    case "in_progress": return "Following Up";
    case "pending": return "Contracts Sent";
    case "resolved": return "Contract Signed";
    case "closed": return "Closed";
    default: return status.replace("_", " ");
  }
};

export const ClientProfileCard = ({ 
  claim, 
  notes, 
  onStatusChange, 
  onAddNote,
  onExpand 
}: ClientProfileCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState("");

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      onExpand(claim.id);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(claim.id, newNote.trim());
      setNewNote("");
    }
  };

  // Sort notes by date (newest first)
  const sortedNotes = [...notes].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <Card className={`transition-all duration-200 ${isOpen ? 'ring-2 ring-primary/20 shadow-lg' : 'hover:shadow-md'}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{claim.full_name}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(claim.accident_date), "MMM d, yyyy")}
                    </span>
                    <span>•</span>
                    <span>{claim.injury_area}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(claim.status)} border-0`}>
                  {getStatusLabel(claim.status)}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Client Details Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Client Details
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{claim.phone}</span>
                  </div>
                  
                  {claim.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{claim.email}</span>
                    </div>
                  )}
                  
                  {claim.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{claim.address}</span>
                    </div>
                  )}
                </div>

                {/* Case Info */}
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Case Information
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Type of Case</span>
                      <p className="font-medium">{claim.injury_area}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Date of Accident</span>
                      <p className="font-medium">{format(new Date(claim.accident_date), "MMMM d, yyyy")}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">At Fault</span>
                      <Badge variant={claim.at_fault === "no" ? "default" : "secondary"}>
                        {claim.at_fault === "no" ? "Not At Fault" : claim.at_fault === "yes" ? "At Fault" : "Unknown"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Date Entered</span>
                      <p className="font-medium">{format(new Date(claim.created_at), "MMMM d, yyyy")}</p>
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div className="mt-4">
                    <Label className="text-muted-foreground">Update Status</Label>
                    <Select
                      value={claim.status}
                      onValueChange={(value) => onStatusChange(claim.id, value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Chase</SelectItem>
                        <SelectItem value="in_progress">Following Up</SelectItem>
                        <SelectItem value="pending">Contracts Sent</SelectItem>
                        <SelectItem value="resolved">Contract Signed</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Case Notes ({notes.length})
                </h4>
                
                {/* Add New Note */}
                <div className="space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this case..."
                    rows={2}
                    className="resize-none"
                  />
                  <Button 
                    onClick={handleAddNote} 
                    disabled={!newNote.trim()}
                    size="sm"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Note
                  </Button>
                </div>

                {/* Notes List - Organized by Date */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {sortedNotes.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No notes yet. Add your first note above.
                    </div>
                  ) : (
                    sortedNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="bg-muted/50 p-3 rounded-lg border border-border/50"
                      >
                        <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
