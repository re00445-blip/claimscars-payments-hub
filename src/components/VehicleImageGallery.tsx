import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ImageOff } from "lucide-react";

interface VehicleImageGalleryProps {
  images: string[];
  vehicleName: string;
}

export const VehicleImageGallery = ({ images, vehicleName }: VehicleImageGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <span className="text-muted-foreground">No images available</span>
      </div>
    );
  }

  return (
    <>
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div
                className="min-h-[300px] max-h-[500px] bg-muted cursor-pointer overflow-hidden flex items-center justify-center p-4"
                onClick={() => setSelectedImageIndex(index)}
              >
                {failedImages.has(index) ? (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageOff className="h-12 w-12 mb-2" />
                    <span className="text-sm">Image unavailable</span>
                  </div>
                ) : (
                  <img
                    src={image}
                    alt={`${vehicleName} - Photo ${index + 1}`}
                    className="max-w-full max-h-[480px] w-auto h-auto object-contain hover:scale-105 transition-transform duration-300"
                    onError={() => handleImageError(index)}
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>

      <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <VisuallyHidden>
            <DialogTitle>{vehicleName} Gallery</DialogTitle>
          </VisuallyHidden>
          {selectedImageIndex !== null && (
            <div className="relative">
              <Carousel className="w-full" opts={{ startIndex: selectedImageIndex }}>
                <CarouselContent>
                  {images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="flex items-center justify-center min-h-[60vh]">
                        {failedImages.has(index) ? (
                          <div className="flex flex-col items-center text-white/60">
                            <ImageOff className="h-16 w-16 mb-2" />
                            <span>Image unavailable</span>
                          </div>
                        ) : (
                          <img
                            src={image}
                            alt={`${vehicleName} - Photo ${index + 1}`}
                            className="max-w-full max-h-[80vh] object-contain"
                            onError={() => handleImageError(index)}
                          />
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 bg-background/80" />
                <CarouselNext className="right-2 bg-background/80" />
              </Carousel>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
                Click arrows or swipe to navigate • {images.length} photos
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
