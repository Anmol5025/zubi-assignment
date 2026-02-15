import React, { useState, useEffect } from 'react';

interface ImageDisplayProps {
  imageUrl: string;
  alt?: string;
}

type ImageState = 'loading' | 'loaded' | 'error';

/**
 * ImageDisplay component renders an image with proper loading and error states.
 * Supports PNG, JPG, and WebP formats.
 * Maintains visibility throughout the conversation session.
 * 
 * @param imageUrl - URL of the image to display
 * @param alt - Alternative text for the image (optional)
 */
export const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, alt = 'Conversation image' }) => {
  const [imageState, setImageState] = useState<ImageState>('loading');

  useEffect(() => {
    // Reset state when imageUrl changes
    setImageState('loading');
    
    // Preload the image
    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
      setImageState('loaded');
    };
    
    img.onerror = () => {
      setImageState('error');
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {imageState === 'loading' && (
        <div 
          className="flex items-center justify-center w-full h-full min-h-[200px]"
          data-testid="image-loading"
        >
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2.5" />
            <p className="text-gray-600">Loading image...</p>
          </div>
        </div>
      )}
      
      {imageState === 'error' && (
        <div 
          className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
          data-testid="image-error"
        >
          <div className="text-center p-5">
            <p className="text-5xl mb-2.5">⚠️</p>
            <p className="text-gray-600">Failed to load image</p>
            <p className="text-xs text-gray-400 mt-1.5">
              Please check the image URL
            </p>
          </div>
        </div>
      )}
      
      {imageState === 'loaded' && (
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-contain block"
          data-testid="image-loaded"
        />
      )}
    </div>
  );
};
