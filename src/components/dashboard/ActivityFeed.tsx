import { CheckCircle2, Clock, AlertCircle, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const activities = [
  { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'Foundation task marked Done', sub: 'DHA Residential · 2h ago' },
  { icon: PlusCircle, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'New task: Conduit & Cable Pulling', sub: 'DHA Residential · 4h ago' },
  { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'Water Supply moved to Review', sub: 'DHA Residential · 6h ago' },
  { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'Ring Road Extension put On Hold', sub: 'Alpha Construction · 1d ago' },
  { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'Main Panel installation 50% done', sub: 'DHA Residential · 1d ago' },
  { icon: PlusCircle, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'Interior Fit-Out domain created', sub: 'Gulberg Tower · 2d ago' },
];

export function ActivityFeed() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {activities.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className={`${item.bg} p-1.5 rounded-lg flex-shrink-0 mt-0.5`}>
                  <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground/90 leading-snug">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
