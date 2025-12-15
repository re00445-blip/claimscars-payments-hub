import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AvatarEditor } from "./AvatarEditor";

interface UserAvatarProps {
  userId: string;
  avatarUrl: string | null;
  fullName: string | null;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onAvatarUpdate?: (newUrl: string) => void;
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export const UserAvatar = ({
  userId,
  avatarUrl,
  fullName,
  size = "md",
  editable = false,
  onAvatarUpdate,
}: UserAvatarProps) => {
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Show preview and open editor
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setShowEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleEditorSave = async (editedBlob: Blob) => {
    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = "jpg";
      const filePath = `avatars/${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-images")
        .upload(filePath, editedBlob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("vehicle-images")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarUpdate?.(publicUrl);
      setDialogOpen(false);
      setPreviewUrl(null);
      setShowEditor(false);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const avatarContent = (
    <Avatar className={`${sizeClasses[size]} border-2 border-primary/20`}>
      <AvatarImage src={avatarUrl || undefined} alt={fullName || "User"} />
      <AvatarFallback className="bg-primary/10 text-primary">
        <User className={iconSizes[size]} />
      </AvatarFallback>
    </Avatar>
  );

  if (!editable) {
    return avatarContent;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) {
        setShowEditor(false);
        setPreviewUrl(null);
      }
    }}>
      <DialogTrigger asChild>
        <button className="relative group cursor-pointer">
          {avatarContent}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className={`${iconSizes[size]} text-white`} />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showEditor ? "Edit Profile Picture" : "Update Profile Picture"}
          </DialogTitle>
        </DialogHeader>
        
        {showEditor && previewUrl ? (
          <AvatarEditor
            imageUrl={previewUrl}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Choose Photo
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
