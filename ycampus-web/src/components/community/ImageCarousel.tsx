import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  className?: string;
}

export function ImageCarousel({ images, className }: ImageCarouselProps) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className={cn('rounded-lg overflow-hidden bg-muted/10 flex justify-center', className)}>
        <img
          src={images[0]}
          alt="Post image"
          className="max-w-full h-auto max-h-[600px] object-contain"
        />
      </div>
    );
  }

  return (
    <Carousel className={cn('w-full', className)}>
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index}>
            <div className="rounded-lg overflow-hidden bg-muted/10 h-[400px] sm:h-[500px] flex items-center justify-center">
              <img
                src={image}
                alt={`Post image ${index + 1}`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}
