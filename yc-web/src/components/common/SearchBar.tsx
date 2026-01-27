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
    <div className={`relative w-full max-w-lg ${className}`}>
      <div className="relative bg-background/80 backdrop-blur-md rounded-full shadow-sm border border-black/5 focus-within:border-blue-500/30 transition-all duration-200">
        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          type="text"
          placeholder={placeholder || "Search"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10.5 rounded-full border-none bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
};

export default SearchBar;
