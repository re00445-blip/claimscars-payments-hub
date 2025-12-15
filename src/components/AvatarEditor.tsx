import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RotateCcw, 
  RotateCw, 
  Crop, 
  SunMedium, 
  Contrast, 
  Droplets,
  Sparkles,
  Check,
  X
} from "lucide-react";

interface AvatarEditorProps {
  imageUrl: string;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
}

const presetFilters = [
  { name: "Normal", brightness: 100, contrast: 100, saturation: 100 },
  { name: "Clarendon", brightness: 110, contrast: 120, saturation: 130 },
  { name: "Gingham", brightness: 105, contrast: 95, saturation: 90 },
  { name: "Moon", brightness: 110, contrast: 110, saturation: 0 },
  { name: "Lark", brightness: 110, contrast: 100, saturation: 90 },
  { name: "Reyes", brightness: 115, contrast: 90, saturation: 85 },
  { name: "Juno", brightness: 100, contrast: 115, saturation: 140 },
  { name: "Slumber", brightness: 105, contrast: 95, saturation: 70 },
];

export const AvatarEditor = ({ imageUrl, onSave, onCancel }: AvatarEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [filters, setFilters] = useState<Filters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });
  const [activeTab, setActiveTab] = useState("crop");
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const applyPreset = (preset: typeof presetFilters[0]) => {
    setFilters({
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.crossOrigin = "anonymous";
      image.src = url;
    });

  const getCroppedImg = async (): Promise<Blob> => {
    const image = await createImage(imageUrl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx || !croppedAreaPixels) {
      throw new Error("Could not get canvas context");
    }

    // Set canvas size to the cropped area
    const outputSize = 400; // Square output
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Apply filters
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;

    // Calculate the center of the crop area
    const cropCenterX = croppedAreaPixels.x + croppedAreaPixels.width / 2;
    const cropCenterY = croppedAreaPixels.y + croppedAreaPixels.height / 2;

    // Save context state
    ctx.save();

    // Move to center of canvas
    ctx.translate(outputSize / 2, outputSize / 2);

    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw the image centered and scaled
    const scale = outputSize / croppedAreaPixels.width;
    ctx.drawImage(
      image,
      -cropCenterX * scale,
      -cropCenterY * scale,
      image.width * scale,
      image.height * scale
    );

    // Restore context
    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg();
      onSave(croppedBlob);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setSaving(false);
    }
  };

  const filterStyle = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`,
  };

  return (
    <div className="space-y-4">
      {/* Preview area */}
      <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
        <div style={filterStyle} className="absolute inset-0">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
      </div>

      {/* Editing tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="crop" className="flex items-center gap-1">
            <Crop className="h-4 w-4" />
            <span className="hidden sm:inline">Crop</span>
          </TabsTrigger>
          <TabsTrigger value="adjust" className="flex items-center gap-1">
            <SunMedium className="h-4 w-4" />
            <span className="hidden sm:inline">Adjust</span>
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crop" className="space-y-4 mt-4">
          {/* Zoom slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={([value]) => setZoom(value)}
            />
          </div>

          {/* Rotation controls */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rotation</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRotation((r) => r - 90)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Slider
                value={[rotation]}
                min={-180}
                max={180}
                step={1}
                onValueChange={([value]) => setRotation(value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRotation((r) => r + 90)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="adjust" className="space-y-4 mt-4">
          {/* Brightness */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SunMedium className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Brightness</label>
              <span className="text-xs text-muted-foreground ml-auto">{filters.brightness}%</span>
            </div>
            <Slider
              value={[filters.brightness]}
              min={50}
              max={150}
              step={1}
              onValueChange={([value]) => setFilters((f) => ({ ...f, brightness: value }))}
            />
          </div>

          {/* Contrast */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Contrast className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Contrast</label>
              <span className="text-xs text-muted-foreground ml-auto">{filters.contrast}%</span>
            </div>
            <Slider
              value={[filters.contrast]}
              min={50}
              max={150}
              step={1}
              onValueChange={([value]) => setFilters((f) => ({ ...f, contrast: value }))}
            />
          </div>

          {/* Saturation */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Saturation</label>
              <span className="text-xs text-muted-foreground ml-auto">{filters.saturation}%</span>
            </div>
            <Slider
              value={[filters.saturation]}
              min={0}
              max={200}
              step={1}
              onValueChange={([value]) => setFilters((f) => ({ ...f, saturation: value }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="filters" className="mt-4">
          <div className="grid grid-cols-4 gap-2">
            {presetFilters.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors hover:bg-accent ${
                  filters.brightness === preset.brightness &&
                  filters.contrast === preset.contrast &&
                  filters.saturation === preset.saturation
                    ? "border-primary bg-primary/10"
                    : "border-border"
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full bg-cover bg-center border"
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    filter: `brightness(${preset.brightness}%) contrast(${preset.contrast}%) saturate(${preset.saturation}%)`,
                  }}
                />
                <span className="text-xs font-medium truncate w-full text-center">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          <Check className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Apply"}
        </Button>
      </div>
    </div>
  );
};
