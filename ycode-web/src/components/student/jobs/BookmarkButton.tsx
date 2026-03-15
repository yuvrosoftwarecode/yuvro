import React, { useState, useEffect } from 'react';
import { BookmarkIcon, Heart } from 'lucide-react';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  isBookmarked,
  isLoading,
  onClick,
  disabled = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isBookmarked && !isLoading) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isBookmarked, isLoading]);

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        relative p-2 rounded-lg transition-all duration-200 transform
        ${isBookmarked
          ? 'bg-blue-500 text-white shadow-lg hover:bg-blue-600 hover:shadow-xl'
          : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-500 hover:shadow-md'
        }
        ${isLoading ? 'opacity-60 cursor-wait' : 'hover:scale-105 active:scale-95'}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        ${isAnimating ? 'animate-bounce' : ''}
      `}
      title={isBookmarked ? 'Remove from bookmarks' : 'Save to bookmarks'}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      <BookmarkIcon 
        className={`
          h-4 w-4 transition-all duration-200
          ${isBookmarked ? 'fill-current' : ''}
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `} 
      />
      
      {isAnimating && (
        <div className="absolute -top-1 -right-1">
          <Heart className="h-3 w-3 text-red-500 animate-ping" />
        </div>
      )}
    </button>
  );
};

export default BookmarkButton;