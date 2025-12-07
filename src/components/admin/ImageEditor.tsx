import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw, RotateCcw, X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageEditorProps {
  images: string[];
  rotations: number[];
  onRemove: (index: number) => void;
  onRotate: (index: number, direction: "cw" | "ccw") => void;
}

export const ImageEditor = ({ images, rotations, onRemove, onRotate }: ImageEditorProps) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No images uploaded yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, index) => (
          <div 
            key={index} 
            className="relative group bg-muted rounded-lg overflow-hidden aspect-square"
          >
            <img
              src={img}
              alt={`Vehicle ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-200"
              style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
            />
            
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              {/* Rotation buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onRotate(index, "ccw")}
                  title="Rotate left"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onRotate(index, "cw")}
                  title="Rotate right"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Preview and delete buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setPreviewIndex(index)}
                  title="Preview"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onRemove(index)}
                  title="Remove"
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
        ))}
      </div>

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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
