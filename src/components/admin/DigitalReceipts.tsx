import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Eye, X, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DigitalReceipt {
  id: string;
  image_url: string;
  vendor: string | null;
  amount: number | null;
  receipt_date: string | null;
  description: string | null;
  category: string | null;
  created_at: string;
}

const VENDORS = ["Apple", "Delta", "Amazon", "BOA", "WF", "Chase", "NF", "Other"];

export const DigitalReceipts = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState<DigitalReceipt[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    vendor: "",
    amount: "",
    receipt_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    category: "business",
  });

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("digital_receipts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Upload image to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      // Save receipt record
      const { error: insertError } = await supabase.from("digital_receipts").insert({
        image_url: urlData.publicUrl,
        vendor: formData.vendor || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        receipt_date: formData.receipt_date || null,
        description: formData.description || null,
        category: formData.category || null,
        created_by: userData.user?.id,
      });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Receipt uploaded successfully",
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setShowUploadForm(false);
      setFormData({
        vendor: "",
        amount: "",
        receipt_date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        category: "business",
      });
      
      fetchReceipts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (receipt: DigitalReceipt) => {
    if (!confirm("Are you sure you want to delete this receipt?")) return;

    try {
      // Extract filename from URL
      const urlParts = receipt.image_url.split("/");
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage.from("receipts").remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from("digital_receipts")
        .delete()
        .eq("id", receipt.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Receipt deleted successfully",
      });

      fetchReceipts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelUpload = () => {
    setShowUploadForm(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({
      vendor: "",
      amount: "",
      receipt_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      category: "business",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Digital Receipts
          </CardTitle>
          {!showUploadForm && (
            <Button onClick={() => setShowUploadForm(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Receipt
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showUploadForm && (
            <div className="border rounded-lg p-4 mb-6 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Upload Section */}
                <div className="space-y-4">
                  <Label>Receipt Image</Label>
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="w-full max-h-64 object-contain rounded-lg border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, JPEG up to 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vendor">Vendor</Label>
                    <Select
                      value={formData.vendor}
                      onValueChange={(value) => setFormData({ ...formData, vendor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {VENDORS.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="receipt_date">Date</Label>
                    <Input
                      id="receipt_date"
                      type="date"
                      value={formData.receipt_date}
                      onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter description"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={cancelUpload}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Save Receipt
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Receipts Grid */}
          {receipts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No receipts uploaded yet.</p>
              <p className="text-sm">Click "Upload Receipt" to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {receipts.map((receipt) => (
                <Card key={receipt.id} className="overflow-hidden">
                  <div
                    className="relative h-40 cursor-pointer group"
                    onClick={() => setPreviewImage(receipt.image_url)}
                  >
                    <img
                      src={receipt.image_url}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm truncate">
                          {receipt.vendor || "Unknown Vendor"}
                        </span>
                        {receipt.amount && (
                          <span className="font-bold text-sm text-green-600">
                            ${Number(receipt.amount).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {receipt.receipt_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(receipt.receipt_date), "MMM dd, yyyy")}
                        </p>
                      )}
                      {receipt.category && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            receipt.category === "business"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {receipt.category.charAt(0).toUpperCase() + receipt.category.slice(1)}
                        </span>
                      )}
                      {receipt.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {receipt.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-2 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(receipt)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="Receipt"
              className="w-full max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
