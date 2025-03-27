
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: string[];
  onClose: () => void;
}

const ImageGallery = ({ open, onOpenChange, files, onClose }: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 bg-black/90 border-none">
        <Button 
          variant="ghost" 
          className="absolute right-2 top-2 text-white rounded-full z-10 p-2 h-auto"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="relative h-[80vh] flex items-center justify-center">
          {files.length > 1 && (
            <>
              <Button
                variant="ghost"
                className="absolute left-2 text-white rounded-full z-10 p-2 h-auto"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              
              <Button
                variant="ghost"
                className="absolute right-2 text-white rounded-full z-10 p-2 h-auto"
                onClick={handleNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}
          
          <img 
            src={files[currentIndex]} 
            alt={`Image ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        
        {files.length > 1 && (
          <div className="bg-black/50 p-2 text-white text-center">
            {currentIndex + 1} / {files.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageGallery;
