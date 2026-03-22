import * as React from "react"
import { Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyText = "No items found.",
  className,
}: MultiSelectProps) {
  const [search, setSearch] = React.useState("")

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((s) => s !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const selectedLabels = options.filter((o) => selected.includes(o.value))

  const filtered = options.filter(
    (o) => o.value && o.label && o.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={cn("w-full rounded-md border border-gray-200 bg-white overflow-hidden", className)}>
      {/* Selected badges */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          {selectedLabels.map((opt) => (
            <Badge
              key={opt.value}
              variant="secondary"
              className="bg-orange-50 text-[#F97316] border border-orange-200 text-xs font-medium px-2 py-0.5 cursor-pointer hover:bg-orange-100 transition-colors"
              onClick={() => handleToggle(opt.value)}
            >
              {opt.label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      {options.length > 3 && (
        <div className="flex items-center border-b border-gray-100 px-3 py-2">
          <Search className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      )}

      {/* Checkbox list — always visible */}
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-400">{emptyText}</div>
        ) : (
          filtered.map((opt) => {
            const isChecked = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer transition-colors border-b border-gray-50 last:border-0",
                  isChecked ? "bg-orange-50/60" : "hover:bg-gray-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(opt.value)}
                  className="sr-only"
                />
                <div className={cn(
                  "flex items-center justify-center h-4 w-4 rounded border shrink-0 transition-colors",
                  isChecked ? "bg-[#F97316] border-[#F97316]" : "border-gray-300 bg-white"
                )}>
                  {isChecked && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="flex-1">{opt.label}</span>
              </label>
            )
          })
        )}
      </div>

      {/* Footer */}
      {selected.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs text-gray-500">{selectedLabels.length} selected</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}