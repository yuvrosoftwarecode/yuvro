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
    <div className={`relative w-full max-w-[224px] ${className}`}>
      <div className="group relative bg-white rounded-[24px] border border-[#dfe1e5] h-[44px] flex items-center hover:shadow-[0_1px_6px_rgb(32_33_36_/_28%)] hover:border-transparent transition-all duration-200 ease-in-out">
        <Search className="absolute left-[14px] h-5 w-5 text-[#9aa0a6]" />
        <Input
          type="text"
          placeholder={placeholder || "Search"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-[42px] h-full w-full rounded-[24px] border-none bg-transparent focus-visible:ring-0 text-[14px] sm:text-[16px] text-[#202124] placeholder:text-transparent md:placeholder:text-[#9aa0a6] shadow-none ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
};

export default SearchBar;
