import { Calendar, Building2, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  startDate?: Date | null;
  endDate?: Date | null;
  company: { name: string; email?: string | null; phone?: string | null };
  ownerCompany?: { name: string } | null;
}

export function ProjectMeta({ project }: { project: Project }) {
  const items = [
    ...(project.ownerCompany?.name ? [{ icon: Building2, label: 'Executing Company', value: project.ownerCompany.name }] : []),
    { icon: Building2, label: 'Client', value: project.company.name },
    ...(project.company.email ? [{ icon: Mail, label: 'Email', value: project.company.email }] : []),
    ...(project.company.phone ? [{ icon: Phone, label: 'Phone', value: project.company.phone }] : []),
    ...(project.startDate ? [{ icon: Calendar, label: 'Start', value: format(new Date(project.startDate), 'dd MMM yyyy') }] : []),
    ...(project.endDate ? [{ icon: Calendar, label: 'Deadline', value: format(new Date(project.endDate), 'dd MMM yyyy') }] : []),
  ];

  return (
    <div className="flex flex-col gap-2 min-w-[180px]">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{item.label}:</span>
            <span className="font-medium text-foreground truncate">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
