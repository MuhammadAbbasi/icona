'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditProjectModal } from './EditProjectModal';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  budget: number | null;
  coveredArea?: number | null;
  rebate?: number | null;
  sstRate?: number | null;
}

interface ProjectSettingsButtonProps {
  project: ProjectData;
  isAdmin?: boolean;
}

export function ProjectSettingsButton({ project, isAdmin }: ProjectSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 px-3 gap-2 text-xs font-semibold border-border hover:bg-muted/80 rounded-lg text-foreground/80 transition-all"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span>Project Settings</span>
      </Button>

      <EditProjectModal
        open={open}
        onOpenChange={setOpen}
        project={project}
        isAdmin={isAdmin}
      />
    </>
  );
}
