import { useState } from "react";
import { format, setMonth, setYear } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

interface SaleDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

export function SaleDatePicker({ date, onDateChange }: SaleDatePickerProps) {
  const [calendarMonth, setCalendarMonth] = useState<Date>(date || new Date());

  const handleMonthSelect = (monthStr: string) => {
    const newDate = setMonth(calendarMonth, parseInt(monthStr));
    setCalendarMonth(newDate);
  };

  const handleYearSelect = (yearStr: string) => {
    const newDate = setYear(calendarMonth, parseInt(yearStr));
    setCalendarMonth(newDate);
  };

  return (
    <div>
      <Label>Sale date</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal mt-1.5",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <Select
              value={String(calendarMonth.getMonth())}
              onValueChange={handleMonthSelect}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {months.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(calendarMonth.getFullYear())}
              onValueChange={handleYearSelect}
            >
              <SelectTrigger className="h-8 text-xs w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
