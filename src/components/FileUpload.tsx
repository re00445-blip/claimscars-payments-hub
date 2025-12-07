import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileImage, FileVideo, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFilesChange: (urls: string[]) => void;
  maxFiles?: number;
  folder: string;
}

export function FileUpload({ onFilesChange, maxFiles = 5, folder }: FileUploadProps) {
  const [files, setFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const newFiles: { name: string; url: string; type: string }[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not supported. Please use JPG, PNG, WEBP, MP4, MOV, or WEBM files.`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (50MB max)
      if (file.size > 52428800) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${folder}/${timestamp}-${sanitizedName}`;

        const { data, error } = await supabase.storage
          .from('claim-uploads')
          .upload(filePath, file);

        if (error) throw error;

        const { data: publicUrl } = supabase.storage
          .from('claim-uploads')
          .getPublicUrl(data.path);

        newFiles.push({
          name: file.name,
          url: publicUrl.publicUrl,
          type: file.type.startsWith('video') ? 'video' : 'image',
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        });
      }
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles.map(f => f.url));
    setIsUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles.map(f => f.url));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || files.length >= maxFiles}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Photos/Videos ({files.length}/{maxFiles})
            </>
          )}
        </Button>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden border bg-muted"
            >
              {file.type === 'video' ? (
                <div className="aspect-video flex items-center justify-center bg-muted">
                  <FileVideo className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="aspect-video relative">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-xs text-white truncate">{file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Supported: JPG, PNG, WEBP, MP4, MOV, WEBM (max 50MB each)
      </p>
    </div>
  );
}