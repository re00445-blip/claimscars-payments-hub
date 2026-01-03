import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Archive, ArchiveRestore, StickyNote, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface Note {
  id: string;
  content: string;
  note_date: string;
  is_archived: boolean;
  created_at: string;
}

export const NotesManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ content: "", note_date: format(new Date(), "yyyy-MM-dd") });
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_notes")
        .select("*")
        .order("note_date", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
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

  const addNote = async () => {
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
      
      const { error } = await supabase
        .from("admin_notes")
        .insert({
          content: newNote.content,
          note_date: newNote.note_date,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Your note has been saved",
      });

      setNewNote({ content: "", note_date: format(new Date(), "yyyy-MM-dd") });
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
          Keep track of important notes with dates
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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={newNote.note_date}
                onChange={(e) => setNewNote({ ...newNote, note_date: e.target.value })}
                className="w-auto"
              />
            </div>
            <Textarea
              placeholder="Enter your note here..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="min-h-[100px]"
            />
            <Button onClick={addNote} disabled={adding}>
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
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(note.note_date), "MMMM d, yyyy")}
                    </div>
                    <p className="whitespace-pre-wrap">{note.content}</p>
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
