import { Trip } from '@/types/mileage';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Calendar, DollarSign, Route } from 'lucide-react';
import { format } from 'date-fns';

interface MileageSummaryProps {
  trips: Trip[];
  totalMiles: number;
}

const MILEAGE_RATE = 0.75; // Reimbursement rate per mile

export const MileageSummary = ({ trips, totalMiles }: MileageSummaryProps) => {
  const reimbursement = totalMiles * MILEAGE_RATE;
  const currentMonth = format(new Date(), 'MMMM yyyy');
  const tripCount = trips.length;

  const stats = [
    {
      label: 'Total Miles',
      value: totalMiles.toFixed(1),
      suffix: 'mi',
      icon: Car,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Trips',
      value: tripCount.toString(),
      suffix: '',
      icon: Route,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Reimbursement',
      value: `$${reimbursement.toFixed(2)}`,
      suffix: '',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Period',
      value: currentMonth,
      suffix: '',
      icon: Calendar,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.label}
          className="shadow-card animate-fade-in"
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-xl p-3 ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold text-foreground">
                {stat.value}
                {stat.suffix && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {stat.suffix}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
