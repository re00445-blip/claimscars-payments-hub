import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Upload, ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageEditor } from "@/components/admin/ImageEditor";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number | null;
  color: string | null;
  vin: string;
  description: string | null;
  images: string[] | null;
  status: string | null;
  created_at: string | null;
}

const AdminVehicles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    price: 0,
    mileage: 0,
    color: "",
    vin: "",
    description: "",
    images: [] as string[],
    status: "active",
  });
  const [imageRotations, setImageRotations] = useState<number[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchVehicles();
    }
  }, [isAdmin]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    setIsAdmin(true);
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        variant: "destructive",
      });
      return;
    }

    setVehicles(data || []);
  };

  const resetForm = () => {
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      price: 0,
      mileage: 0,
      color: "",
      vin: "",
      description: "",
      images: [],
      status: "active",
    });
    setImageRotations([]);
    setEditingVehicle(null);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      mileage: vehicle.mileage || 0,
      color: vehicle.color || "",
      vin: vehicle.vin,
      description: vehicle.description || "",
      images: vehicle.images || [],
      status: vehicle.status || "active",
    });
    setImageRotations(new Array(vehicle.images?.length || 0).fill(0));
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];
    const unsupportedFormats = ['heic', 'heif'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split(".").pop()?.toLowerCase() || '';
      
      // Check for unsupported formats like HEIC
      if (unsupportedFormats.includes(fileExt)) {
        toast({
          title: "Unsupported Format",
          description: `${file.name} is a HEIC file. Please convert to JPG or PNG before uploading.`,
          variant: "destructive",
        });
        continue;
      }
      
      try {
        // Compress image before upload
        const compressedFile = await compressImage(file);
        
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `vehicles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("vehicle-images")
          .upload(filePath, compressedFile);

        if (uploadError) {
          toast({
            title: "Upload Error",
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
            variant: "destructive",
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("vehicle-images")
          .getPublicUrl(filePath);

        newImages.push(urlData.publicUrl);
      } catch (err) {
        toast({
          title: "Upload Error",
          description: `Failed to process ${file.name}. Try a different format.`,
          variant: "destructive",
        });
      }
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
    setImageRotations(prev => [...prev, ...new Array(newImages.length).fill(0)]);

    setUploading(false);
    if (newImages.length > 0) {
      toast({
        title: "Success",
        description: `${newImages.length} image(s) uploaded`,
      });
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        // Max dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;
        
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          "image/jpeg",
          0.8 // 80% quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setImageRotations(prev => prev.filter((_, i) => i !== index));
  };

  const rotateImage = (index: number, direction: "cw" | "ccw") => {
    setImageRotations(prev => {
      const newRotations = [...prev];
      const delta = direction === "cw" ? 90 : -90;
      newRotations[index] = ((newRotations[index] || 0) + delta) % 360;
      return newRotations;
    });
  };

  const cropImage = (index: number, croppedImageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? croppedImageUrl : img),
    }));
    // Reset rotation after crop since the crop already includes the rotation
    setImageRotations(prev => {
      const newRotations = [...prev];
      newRotations[index] = 0;
      return newRotations;
    });
  };

  const reorderImages = (newImages: string[], newRotations: number[]) => {
    setFormData(prev => ({
      ...prev,
      images: newImages,
    }));
    setImageRotations(newRotations);
  };

  // Function to apply rotation to an image and return a new data URL
  const applyRotationToImage = (imageSrc: string, rotation: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (rotation === 0) {
        resolve(imageSrc);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Normalize rotation to 0, 90, 180, 270
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        
        // Swap dimensions for 90 and 270 degree rotations
        if (normalizedRotation === 90 || normalizedRotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((normalizedRotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageSrc;
    });
  };

  // Function to upload a data URL image to storage
  const uploadDataUrlImage = async (dataUrl: string, index: number): Promise<string> => {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    const fileName = `${Date.now()}-rotated-${index}.jpg`;
    const filePath = `vehicles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("vehicle-images")
      .upload(filePath, blob);

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from("vehicle-images")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Apply rotations to images that need it
      const processedImages: string[] = [];
      
      for (let i = 0; i < formData.images.length; i++) {
        const image = formData.images[i];
        const rotation = imageRotations[i] || 0;
        
        if (rotation !== 0) {
          // Apply rotation and get new data URL
          const rotatedDataUrl = await applyRotationToImage(image, rotation);
          
          // If the original was a URL (not a data URL), upload the rotated version
          if (!image.startsWith("data:")) {
            const newUrl = await uploadDataUrlImage(rotatedDataUrl, i);
            processedImages.push(newUrl);
          } else {
            // If it was already a data URL (from cropping), upload it
            const newUrl = await uploadDataUrlImage(rotatedDataUrl, i);
            processedImages.push(newUrl);
          }
        } else if (image.startsWith("data:")) {
          // Image is a data URL from cropping, upload it
          const newUrl = await uploadDataUrlImage(image, i);
          processedImages.push(newUrl);
        } else {
          // No rotation needed, keep original URL
          processedImages.push(image);
        }
      }

      const vehicleData = {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        price: formData.price,
        mileage: formData.mileage || null,
        color: formData.color || null,
        vin: formData.vin,
        description: formData.description || null,
        images: processedImages.length > 0 ? processedImages : null,
        status: formData.status,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from("vehicles")
          .update(vehicleData)
          .eq("id", editingVehicle.id);

        if (error) {
          toast({
            title: "Error",
            description: "Failed to update vehicle",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Vehicle updated successfully",
          });
          fetchVehicles();
          setIsDialogOpen(false);
          resetForm();
        }
      } else {
        const { error } = await supabase
          .from("vehicles")
          .insert(vehicleData);

        if (error) {
          toast({
            title: "Error",
            description: "Failed to add vehicle",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Vehicle added successfully",
          });
          fetchVehicles();
          setIsDialogOpen(false);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast({
        title: "Error",
        description: "Failed to process images. Please try again.",
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      });
      fetchVehicles();
    }
  };

  const toggleStatus = async (vehicle: Vehicle) => {
    const newStatus = vehicle.status === "active" ? "sold" : "active";
    
    const { error } = await supabase
      .from("vehicles")
      .update({ status: newStatus })
      .eq("id", vehicle.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Vehicle marked as ${newStatus}`,
      });
      fetchVehicles();
    }
  };

  const generateDescription = async () => {
    if (!formData.make || !formData.model || !formData.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in make, model, and price first.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingDescription(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-vehicle-description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            year: formData.year,
            make: formData.make,
            model: formData.model,
            mileage: formData.mileage || undefined,
            color: formData.color || undefined,
            price: formData.price,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate description");
      }

      const data = await response.json();
      
      if (data.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        toast({
          title: "Description Generated",
          description: "AI-generated description has been added.",
        });
      }
    } catch (error) {
      console.error("Error generating description:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate description",
        variant: "destructive",
      });
    }

    setGeneratingDescription(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Vehicle Inventory</h1>
              <p className="text-muted-foreground mt-1">
                Manage your vehicle listings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/reports")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
                  <DialogDescription>
                    {editingVehicle ? "Update the vehicle details below" : "Enter the vehicle details below"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="make">Make</Label>
                      <Input
                        id="make"
                        value={formData.make}
                        onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                        placeholder="Toyota"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="RAV4"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vin">VIN</Label>
                      <Input
                        id="vin"
                        value={formData.vin}
                        onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                        placeholder="Vehicle ID Number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Mileage</Label>
                      <Input
                        id="mileage"
                        type="number"
                        value={formData.mileage}
                        onChange={(e) => setFormData(prev => ({ ...prev, mileage: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="Black"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="active">Active (For Sale)</option>
                        <option value="sold">Sold</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Description</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateDescription}
                        disabled={generatingDescription}
                      >
                        {generatingDescription ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Vehicle description, condition, features..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Images</Label>
                    <ImageEditor
                      images={formData.images}
                      rotations={imageRotations}
                      onRemove={removeImage}
                      onRotate={rotateImage}
                      onCrop={cropImage}
                      onReorder={reorderImages}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="flex-1"
                      />
                      {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Images are automatically compressed. Hover over images to rotate or remove them.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingVehicle ? "Update Vehicle" : "Add Vehicle"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Vehicles ({vehicles.length})</CardTitle>
            <CardDescription>Click on a vehicle to edit or manage its status</CardDescription>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No vehicles in inventory. Click "Add Vehicle" to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>VIN</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Mileage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          {vehicle.images && vehicle.images.length > 0 ? (
                            <img
                              src={vehicle.images[0]}
                              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                              className="w-16 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              No img
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                          {vehicle.color && (
                            <span className="text-muted-foreground ml-1">({vehicle.color})</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{vehicle.vin}</TableCell>
                        <TableCell>${vehicle.price.toLocaleString()}</TableCell>
                        <TableCell>{vehicle.mileage?.toLocaleString() || "N/A"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={vehicle.status === "active" ? "default" : vehicle.status === "sold" ? "secondary" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleStatus(vehicle)}
                          >
                            {vehicle.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(vehicle)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the {vehicle.year} {vehicle.make} {vehicle.model}?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminVehicles;