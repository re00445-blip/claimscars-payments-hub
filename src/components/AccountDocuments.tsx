import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Download, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";

interface AccountDocument {
  id: string;
  account_id: string;
  uploaded_by: string;
  uploaded_by_role: "admin" | "customer";
  file_name: string;
  file_url: string;
  file_type: string | null;
  description: string | null;
  created_at: string;
}

interface AccountDocumentsProps {
  accountId: string;
  userRole: "admin" | "customer";
  userId: string;
}

export const AccountDocuments = ({ accountId, userRole, userId }: AccountDocumentsProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<AccountDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [accountId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_documents")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } else {
      setDocuments(data as AccountDocument[]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, images, or Word documents",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `account-documents/${accountId}/${timestamp}-${sanitizedName}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('claim-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('claim-uploads')
        .getPublicUrl(uploadData.path);

      // Save document record
      const { error: insertError } = await supabase
        .from("account_documents")
        .insert({
          account_id: accountId,
          uploaded_by: userId,
          uploaded_by_role: userRole,
          file_name: file.name,
          file_url: publicUrl.publicUrl,
          file_type: file.type,
          description: description || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchDocuments();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    }

    setUploading(false);
  };

  const handleDelete = async (doc: AccountDocument) => {
    // Only admins can delete
    if (userRole !== "admin") {
      toast({
        title: "Permission denied",
        description: "Only admins can delete documents",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this document?")) return;

    const { error } = await supabase
      .from("account_documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Document deleted",
      });
      fetchDocuments();
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.startsWith('image/')) {
      return "🖼️";
    } else if (fileType === 'application/pdf') {
      return "📄";
    } else {
      return "📎";
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Account Documents
        </CardTitle>
        <CardDescription>
          Upload and manage documents related to this account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="doc-description">Description (optional)</Label>
            <Input
              id="doc-description"
              placeholder="e.g., Insurance document, ID copy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              id="doc-upload"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported: PDF, Images, Word documents (max 10MB)
          </p>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{getFileIcon(doc.file_type)}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground truncate">{doc.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Uploaded by {doc.uploaded_by_role === 'admin' ? 'Admin' : 'Customer'} • {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    title="View document"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    title="Download document"
                  >
                    <a href={doc.file_url} download={doc.file_name}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {userRole === "admin" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc)}
                      className="text-destructive hover:text-destructive"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
