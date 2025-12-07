import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw, RotateCcw, X, ZoomIn, Crop, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ImageEditorProps {
  images: string[];
  rotations: number[];
  onRemove: (index: number) => void;
  onRotate: (index: number, direction: "cw" | "ccw") => void;
  onCrop: (index: number, croppedImageUrl: string) => void;
  onReorder: (newImages: string[], newRotations: number[]) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SortableImageProps {
  id: string;
  index: number;
  image: string;
  rotation: number;
  onRotate: (direction: "cw" | "ccw") => void;
  onCrop: () => void;
  onPreview: () => void;
  onRemove: () => void;
}

const SortableImage = ({ id, index, image, rotation, onRotate, onCrop, onPreview, onRemove }: SortableImageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-muted rounded-lg overflow-hidden aspect-square"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 z-20 bg-black/70 text-white p-1 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <img
        src={image}
        alt={`Vehicle ${index + 1}`}
        className="w-full h-full object-cover transition-transform duration-200"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      
      {/* Overlay controls */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 pointer-events-none">
        {/* Rotation buttons */}
        <div className="flex gap-1 pointer-events-auto">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); onRotate("ccw"); }}
            title="Rotate left"
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); onRotate("cw"); }}
            title="Rotate right"
            className="h-8 w-8 p-0"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); onCrop(); }}
            title="Crop"
            className="h-8 w-8 p-0"
          >
            <Crop className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Preview and delete buttons */}
        <div className="flex gap-1 pointer-events-auto">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            title="Preview"
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Image number badge */}
      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
    </div>
  );
};

export const ImageEditor = ({ images, rotations, onRemove, onRotate, onCrop, onReorder }: ImageEditorProps) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create unique IDs for each image based on index
  const imageIds = images.map((_, index) => `image-${index}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = imageIds.indexOf(active.id as string);
      const newIndex = imageIds.indexOf(over.id as string);

      const newImages = arrayMove(images, oldIndex, newIndex);
      const newRotations = arrayMove(rotations, oldIndex, newIndex);
      
      onReorder(newImages, newRotations);
    }
  };

  const onCropComplete = useCallback((_: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (imageSrc: string, pixelCrop: CropArea, rotation: number): Promise<string> => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    
    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        const rotRad = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rotRad));
        const cos = Math.abs(Math.cos(rotRad));
        
        const rotatedWidth = image.width * cos + image.height * sin;
        const rotatedHeight = image.width * sin + image.height * cos;

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        
        if (!tempCtx) {
          reject(new Error("Could not get temp canvas context"));
          return;
        }

        tempCanvas.width = rotatedWidth;
        tempCanvas.height = rotatedHeight;

        tempCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
        tempCtx.rotate(rotRad);
        tempCtx.translate(-image.width / 2, -image.height / 2);
        tempCtx.drawImage(image, 0, 0);

        ctx.drawImage(
          tempCanvas,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = imageSrc;
    });
  };

  const handleCropSave = async () => {
    if (cropIndex === null || !croppedAreaPixels) return;
    
    try {
      const croppedImage = await createCroppedImage(
        images[cropIndex],
        croppedAreaPixels,
        rotations[cropIndex] || 0
      );
      onCrop(cropIndex, croppedImage);
      setCropIndex(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  const openCropDialog = (index: number) => {
    setCropIndex(index);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  if (images.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No images uploaded yet
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={imageIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, index) => (
              <SortableImage
                key={imageIds[index]}
                id={imageIds[index]}
                index={index}
                image={img}
                rotation={rotations[index] || 0}
                onRotate={(direction) => onRotate(index, direction)}
                onCrop={() => openCropDialog(index)}
                onPreview={() => setPreviewIndex(index)}
                onRemove={() => onRemove(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p className="text-xs text-muted-foreground mt-2">
        Drag images to reorder. Hover for edit options.
      </p>

      {/* Preview Dialog */}
      <Dialog open={previewIndex !== null} onOpenChange={() => setPreviewIndex(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          <VisuallyHidden>
            <DialogTitle>Image Preview</DialogTitle>
          </VisuallyHidden>
          {previewIndex !== null && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={images[previewIndex]}
                alt={`Vehicle ${previewIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain"
                style={{ transform: `rotate(${rotations[previewIndex] || 0}deg)` }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onRotate(previewIndex, "ccw")}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Rotate Left
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onRotate(previewIndex, "cw")}
                >
                  <RotateCw className="h-4 w-4 mr-1" />
                  Rotate Right
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    openCropDialog(previewIndex);
                    setPreviewIndex(null);
                  }}
                >
                  <Crop className="h-4 w-4 mr-1" />
                  Crop
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      <Dialog open={cropIndex !== null} onOpenChange={() => setCropIndex(null)}>
        <DialogContent className="max-w-3xl p-4">
          <DialogTitle>Crop Image</DialogTitle>
          {cropIndex !== null && (
            <div className="flex flex-col gap-4">
              <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={images[cropIndex]}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotations[cropIndex] || 0}
                  aspect={4 / 3}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Zoom</label>
                <Slider
                  value={[zoom]}
                  onValueChange={(values) => setZoom(values[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCropIndex(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCropSave}>
                  Apply Crop
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
