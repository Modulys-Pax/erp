import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  indicator?: {
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  };
  href?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  indicator,
  href,
  className,
}: StatCardProps) {
  const content = (
    <Card className={cn('rounded-xl shadow-sm hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-label mb-1">{title}</p>
            <p className="text-kpi-value whitespace-nowrap overflow-hidden text-ellipsis">{value}</p>
            {indicator && (
              <p
                className={cn(
                  'text-xs mt-1',
                  indicator.trend === 'up' && 'text-green-600',
                  indicator.trend === 'down' && 'text-red-600',
                  indicator.trend === 'neutral' && 'text-muted-foreground',
                )}
              >
                {indicator.value}
              </p>
            )}
          </div>
          {Icon && (
            <div className="ml-4 p-3 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}
