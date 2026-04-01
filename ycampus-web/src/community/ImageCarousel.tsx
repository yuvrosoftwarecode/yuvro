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
      <div className={cn('rounded-lg overflow-hidden', className)}>
        <img
          src={images[0]}
          alt="Post image"
          className="w-full h-auto max-h-96 object-cover"
        />
      </div>
    );
  }

  return (
    <Carousel className={cn('w-full', className)}>
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index}>
            <div className="rounded-lg overflow-hidden">
              <img
                src={image}
                alt={`Post image ${index + 1}`}
                className="w-full h-auto max-h-96 object-cover"
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
