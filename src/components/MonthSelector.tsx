import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { format, subMonths, addMonths, isSameMonth } from 'date-fns';

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

export const MonthSelector = ({ selectedMonth, onMonthChange }: MonthSelectorProps) => {
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const handlePreviousMonth = () => {
    onMonthChange(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(selectedMonth, 1));
  };

  const handleCurrentMonth = () => {
    onMonthChange(new Date());
  };

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Archive className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Viewing:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="min-w-[120px] text-center font-medium">
          {format(selectedMonth, 'MMMM yyyy')}
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          disabled={isCurrentMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentMonth}
          className="text-xs"
        >
          Current Month
        </Button>
      )}
      
      {isCurrentMonth && (
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          Current
        </span>
      )}
    </div>
  );
};
