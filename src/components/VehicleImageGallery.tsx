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

interface VehicleImageGalleryProps {
  images: string[];
  vehicleName: string;
}

export const VehicleImageGallery = ({ images, vehicleName }: VehicleImageGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

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
                className="aspect-video bg-muted cursor-pointer overflow-hidden flex items-center justify-center"
                onClick={() => setSelectedImageIndex(index)}
              >
                <img
                  src={image}
                  alt={`${vehicleName} - Photo ${index + 1}`}
                  className="max-w-full max-h-full object-contain rotate-90 hover:scale-105 transition-transform duration-300"
                />
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
                        <img
                          src={image}
                          alt={`${vehicleName} - Photo ${index + 1}`}
                          className="max-w-full max-h-[80vh] object-contain rotate-90"
                        />
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
