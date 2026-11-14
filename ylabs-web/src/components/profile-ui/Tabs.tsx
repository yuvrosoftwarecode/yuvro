import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[] | readonly T[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: "underline" | "subtle" | "vertical";
  className?: string;
  "aria-label"?: string;
}

export function Tabs<T extends string = string>({
  items,
  activeTab,
  onChange,
  variant = "underline",
  className,
  "aria-label": ariaLabel = "Tabs",
}: TabsProps<T>) {
  // Normalize items
  const normalizedItems: TabItem<T>[] = items.map((item) =>
    typeof item === "string" ? { id: item as T, label: item } : item
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={twMerge(
        clsx(
          variant === "underline" &&
            "flex items-center gap-6 border-b border-line overflow-x-auto no-scrollbar",
          variant === "subtle" &&
            "flex items-center gap-1.5 p-1 bg-line/30 rounded-input overflow-x-auto",
          variant === "vertical" && "flex flex-col space-y-1",
          className
        )
      )}
    >
      {normalizedItems.map((item) => {
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-current={isActive ? "true" : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={twMerge(
              clsx(
                "relative font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 whitespace-nowrap",
                // Underline variant
                variant === "underline" && [
                  "pb-3 pt-1 text-muted hover:text-ink",
                  isActive && "text-primary font-semibold",
                ],
                // Subtle variant
                variant === "subtle" && [
                  "px-3 py-1.5 rounded-md text-sub hover:text-ink",
                  isActive && "bg-card text-ink shadow-sm font-semibold",
                ],
                // Vertical variant
                variant === "vertical" && [
                  "px-3.5 py-2.5 rounded-input text-left text-sub hover:bg-line/40 hover:text-ink w-full",
                  isActive &&
                    "bg-primary-subtle text-primary font-semibold hover:bg-primary-subtle",
                ]
              )
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={clsx(
                  "ml-2 text-xs px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-primary text-white"
                    : "bg-line/60 text-muted"
                )}
              >
                {item.count}
              </span>
            )}

            {/* Active underline indicator */}
            {variant === "underline" && isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full transition-all"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
