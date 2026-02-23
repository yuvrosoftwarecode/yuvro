"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-[#121417] text-white group/calendar p-4 [--cell-size:2.8rem] rounded-2xl shadow-xl",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "long" }),
        formatWeekdayName: (date) =>
          date.toLocaleString("default", { weekday: "narrow" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit mx-auto", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute top-4 right-4 flex items-center gap-1 z-10",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 text-white hover:bg-white/10 rounded-full transition-all",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 text-white hover:bg-white/10 rounded-full transition-all",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-10 w-full items-center justify-start px-2",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-10 w-full items-center justify-center gap-1.5 text-sm font-bold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-lg border border-white/10 bg-white/5 px-1.5 py-1",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 opacity-0 cursor-pointer",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-semibold text-white text-lg tracking-tight",
          captionLayout === "label"
            ? ""
            : "[&>svg]:text-white flex h-10 items-center gap-2 rounded-xl pl-3 pr-2 text-sm [&>svg]:size-4",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("grid grid-cols-7 mb-2", defaultClassNames.weekdays),
        weekday: cn(
          "text-gray-400 flex items-center justify-center select-none text-xs font-medium h-10",
          defaultClassNames.weekday
        ),
        week: cn("grid grid-cols-7 w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] flex items-center justify-center select-none text-[10px] font-bold text-gray-500",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground flex items-center justify-center select-none text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative h-[--cell-size] w-[--cell-size] select-none p-0.5 flex items-center justify-center",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-white/10 text-white rounded-full",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none bg-white/5", defaultClassNames.range_middle),
        range_end: cn("bg-white/10 text-white rounded-full", defaultClassNames.range_end),
        today: cn(
          "text-white font-bold",
          defaultClassNames.today
        ),
        outside: cn(
          "text-gray-600 pointer-events-none",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-gray-700 opacity-30 cursor-not-allowed",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-5", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-5", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-5", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "h-9 w-9 flex items-center justify-center font-medium text-sm transition-all hover:bg-white/10 rounded-full border border-transparent",
        modifiers.selected && "border border-white bg-transparent text-white",
        modifiers.today && !modifiers.selected && "text-white font-bold",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
