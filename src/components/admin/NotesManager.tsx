import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Archive, ArchiveRestore, StickyNote, Calendar, Clock, Tag, Paperclip, User, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TimeEntry {
  time: string;
  description: string;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  note_date: string;
  is_archived: boolean;
  created_at: string;
  subject: string | null;
  assignee_id: string | null;
  due_date: string | null;
  response_time_hours: number | null;
  attachments: string[];
  tags: string[];
  time_entries: TimeEntry[];
  notified_at: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
}

type Department = 'customer' | 'manager' | 'accounting' | 'team_member' | 'marketing_affiliate';

const DEPARTMENT_LABELS: Record<Department, string> = {
  customer: 'Customers',
  manager: 'Managers',
  accounting: 'Accounting',
  team_member: 'Team Members',
  marketing_affiliate: 'Marketing Affiliates',
};

const DEPARTMENT_ORDER: Department[] = ['manager', 'accounting', 'team_member', 'marketing_affiliate', 'customer'];

const RESPONSE_TIME_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "4", label: "4 hours" },
  { value: "8", label: "8 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
];

export const NotesManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newNote, setNewNote] = useState({
    subject: "",
    content: "",
    note_date: format(new Date(), "yyyy-MM-dd"),
    assignee_id: "",
    due_date: "",
    response_time_hours: "",
    newTag: "",
    tags: [] as string[],
    newTimeEntry: "",
    timeEntries: [] as TimeEntry[],
  });
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);

  useEffect(() => {
    loadNotes();
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, department");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Error loading profiles:", error.message);
    }
  };

  const getGroupedProfiles = () => {
    const grouped: Record<Department, Profile[]> = {
      customer: [],
      manager: [],
      accounting: [],
      team_member: [],
      marketing_affiliate: [],
    };

    profiles.forEach(profile => {
      const dept = (profile.department as Department) || 'team_member';
      if (grouped[dept]) {
        grouped[dept].push(profile);
      } else {
        grouped.team_member.push(profile);
      }
    });

    return grouped;
  };

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_notes")
        .select("*")
        .order("note_date", { ascending: false });

      if (error) throw error;
      
      const typedNotes = (data || []).map(note => ({
        ...note,
        attachments: (note.attachments || []) as string[],
        tags: (note.tags || []) as string[],
        time_entries: (Array.isArray(note.time_entries) ? note.time_entries : []) as unknown as TimeEntry[],
      }));
      
      setNotes(typedNotes);
    } catch (error: any) {
      toast({
        title: "Error loading notes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `note-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setPendingAttachments(prev => [...prev, publicUrl]);
      
      toast({
        title: "File uploaded",
        description: file.name,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const addTag = () => {
    if (newNote.newTag.trim() && !newNote.tags.includes(newNote.newTag.trim())) {
      setNewNote(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: "",
      }));
    }
  };

  const removeTag = (tag: string) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const addTimeEntry = () => {
    if (newNote.newTimeEntry.trim()) {
      setNewNote(prev => ({
        ...prev,
        timeEntries: [...prev.timeEntries, {
          time: format(new Date(), "HH:mm"),
          description: prev.newTimeEntry.trim(),
          created_at: new Date().toISOString(),
        }],
        newTimeEntry: "",
      }));
    }
  };

  const removeTimeEntry = (index: number) => {
    setNewNote(prev => ({
      ...prev,
      timeEntries: prev.timeEntries.filter((_, i) => i !== index),
    }));
  };

  const sendNotification = async (assigneeId: string, subject: string) => {
    const assignee = profiles.find(p => p.id === assigneeId);
    if (!assignee) return;

    try {
      // Send email notification
      await supabase.functions.invoke('send-custom-email', {
        body: {
          to: assignee.email,
          subject: `New Note Assigned: ${subject}`,
          html: `<p>You have been assigned a new note: <strong>${subject}</strong></p>`,
        },
      });

      toast({
        title: "Notification sent",
        description: `Email sent to ${assignee.full_name || assignee.email}`,
      });
    } catch (error: any) {
      console.error("Failed to send notification:", error);
    }
  };

  const addNote = async () => {
    if (!newNote.subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject line",
        variant: "destructive",
      });
      return;
    }

    if (!newNote.content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter note content",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const noteData: any = {
        subject: newNote.subject,
        content: newNote.content,
        note_date: newNote.note_date,
        created_by: user?.id,
        tags: newNote.tags,
        time_entries: newNote.timeEntries,
        attachments: pendingAttachments,
      };

      if (newNote.assignee_id) {
        noteData.assignee_id = newNote.assignee_id;
      }
      if (newNote.due_date) {
        noteData.due_date = newNote.due_date;
      }
      if (newNote.response_time_hours) {
        noteData.response_time_hours = parseInt(newNote.response_time_hours);
      }

      const { error } = await supabase
        .from("admin_notes")
        .insert(noteData);

      if (error) throw error;

      // Send notification if assignee is set
      if (newNote.assignee_id) {
        await sendNotification(newNote.assignee_id, newNote.subject);
      }

      toast({
        title: "Note added",
        description: "Your note has been saved",
      });

      setNewNote({
        subject: "",
        content: "",
        note_date: format(new Date(), "yyyy-MM-dd"),
        assignee_id: "",
        due_date: "",
        response_time_hours: "",
        newTag: "",
        tags: [],
        newTimeEntry: "",
        timeEntries: [],
      });
      setPendingAttachments([]);
      loadNotes();
    } catch (error: any) {
      toast({
        title: "Error adding note",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const toggleArchive = async (id: string, currentArchived: boolean) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from("admin_notes")
        .update({ is_archived: !currentArchived })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: currentArchived ? "Note restored" : "Note archived",
        description: currentArchived ? "Note has been restored" : "Note has been archived",
      });

      loadNotes();
    } catch (error: any) {
      toast({
        title: "Error updating note",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const deleteNote = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from("admin_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Note deleted",
        description: "Note has been permanently deleted",
      });

      loadNotes();
    } catch (error: any) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const getAssigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return null;
    const profile = profiles.find(p => p.id === assigneeId);
    return profile?.full_name || profile?.email || "Unknown";
  };

  const filteredNotes = notes.filter(note => showArchived ? note.is_archived : !note.is_archived);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Notes
        </CardTitle>
        <CardDescription>
          Manage notes with assignments, due dates, and attachments
        </CardDescription>
        <div className="flex items-center gap-2 mt-4">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived" className="flex items-center gap-1 cursor-pointer">
            <Archive className="h-4 w-4" />
            Show Archived
          </Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Note */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Note
          </h3>
          <div className="space-y-4">
            {/* Subject Line */}
            <div>
              <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter subject..."
                value={newNote.subject}
                onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Date & Assignee Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Note Date
                </Label>
                <Input
                  type="date"
                  value={newNote.note_date}
                  onChange={(e) => setNewNote({ ...newNote, note_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <User className="h-4 w-4" /> Assignee
                </Label>
                <Select
                  value={newNote.assignee_id}
                  onValueChange={(value) => setNewNote({ ...newNote, assignee_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select assignee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_ORDER.map((dept) => {
                      const deptProfiles = getGroupedProfiles()[dept];
                      if (deptProfiles.length === 0) return null;
                      return (
                        <div key={dept}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {DEPARTMENT_LABELS[dept]}
                          </div>
                          {deptProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name || profile.email}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date & Response Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Due Date
                </Label>
                <Input
                  type="date"
                  value={newNote.due_date}
                  onChange={(e) => setNewNote({ ...newNote, due_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Response Time Needed
                </Label>
                <Select
                  value={newNote.response_time_hours}
                  onValueChange={(value) => setNewNote({ ...newNote, response_time_hours: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select response time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSE_TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message Box */}
            <div>
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                placeholder="Enter your note content here..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="min-h-[120px] mt-1"
              />
            </div>

            {/* Attachment Features */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
              
              {/* Attach File */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploadingFile}>
                  <label className="cursor-pointer">
                    {uploadingFile ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4 mr-2" />
                    )}
                    Attach File
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </label>
                </Button>
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pendingAttachments.map((url, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        File {i + 1}
                        <button
                          onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Time Entry */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add time entry description..."
                  value={newNote.newTimeEntry}
                  onChange={(e) => setNewNote({ ...newNote, newTimeEntry: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTimeEntry())}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addTimeEntry}>
                  <Clock className="h-4 w-4 mr-2" />
                  Add Time
                </Button>
              </div>
              {newNote.timeEntries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {newNote.timeEntries.map((entry, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {entry.time} - {entry.description}
                      <button
                        onClick={() => removeTimeEntry(i)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add Tag */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newNote.newTag}
                  onChange={(e) => setNewNote({ ...newNote, newTag: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addTag}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </div>
              {newNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {newNote.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={addNote} disabled={adding} className="w-full">
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Note
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {showArchived ? "No archived notes" : "No active notes"}
            </p>
          ) : (
            filteredNotes.map((note) => (
              <div 
                key={note.id} 
                className={`border rounded-lg p-4 ${note.is_archived ? 'bg-muted/50 opacity-75' : 'bg-background'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Subject & Date */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">{note.subject || "No Subject"}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(note.note_date), "MMM d, yyyy")}
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {note.assignee_id && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {getAssigneeName(note.assignee_id)}
                        </span>
                      )}
                      {note.due_date && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Due: {format(new Date(note.due_date), "MMM d")}
                        </span>
                      )}
                      {note.response_time_hours && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Response: {note.response_time_hours}h
                        </span>
                      )}
                      {note.notified_at && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Bell className="h-3 w-3" />
                          Notified
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Time Entries */}
                    {note.time_entries && note.time_entries.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.time_entries.map((entry, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {entry.time} - {entry.description}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Attachments */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.attachments.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Paperclip className="h-3 w-3" />
                            Attachment {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleArchive(note.id, note.is_archived)}
                      disabled={processingIds.has(note.id)}
                      title={note.is_archived ? "Restore note" : "Archive note"}
                    >
                      {processingIds.has(note.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : note.is_archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                    {note.is_archived && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNote(note.id)}
                        disabled={processingIds.has(note.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete permanently"
                      >
                        {processingIds.has(note.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
