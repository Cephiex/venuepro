import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function DateTimePicker({ value, onChange, className }) {
  const [date, setDate] = useState(null);
  const [time, setTime] = useState('09:00');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      try {
        const dateObj = new Date(value);
        if (!isNaN(dateObj)) {
          setDate(dateObj);
          setTime(format(dateObj, 'HH:mm'));
        }
      } catch (e) {
        // handle invalid date string
        setDate(null);
        setTime('09:00');
      }
    } else {
      setDate(null);
      setTime('09:00');
    }
  }, [value]);

  const handleDateChange = (newDate) => {
    if (!newDate) return;
    setDate(newDate);
    
    // Create datetime string in local timezone without conversion issues
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const [hours, minutes] = time.split(':');
    
    const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
    onChange(dateTimeString);
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (date) {
      // Manually construct the datetime string to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const [hours, minutes] = newTime.split(':');
      
      const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      onChange(dateTimeString);
    }
  };

  const displayValue = value ? format(new Date(value), "MMM d, yyyy 'at' h:mm a") : "Select date and time";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={`w-full justify-start text-left font-normal ${!value && "text-muted-foreground"} ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateChange}
          initialFocus
        />
        <div className="p-4 border-t border-border">
            <Input
              type="time"
              value={time}
              onChange={handleTimeChange}
            />
        </div>
        <div className="p-4 pt-0">
          <Button onClick={() => setIsOpen(false)} className="w-full">Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}