import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Props {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: React.FC<Props> = ({ searchQuery, setSearchQuery, placeholder, className = "" }) => {
  return (
    <div className={`relative w-full max-w-lg transform hover:scale-105 transition-transform duration-300 ${className}`}>
      {/* Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl opacity-50" />

      {/* Glassmorphic Container */}
      <div className="relative bg-background/80 backdrop-blur-md rounded-full shadow-lg border border-white/20">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder || "Search"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 rounded-full border-none bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground/70"
        />
      </div>
    </div>
  );
};

export default SearchBar;
