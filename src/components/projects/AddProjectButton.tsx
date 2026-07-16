'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddProjectModal } from './AddProjectModal';

interface Company { id: string; name: string; type: string; }

export function AddProjectButton({ companies }: { companies: Company[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        New Project
      </Button>
      <AddProjectModal open={open} onOpenChange={setOpen} companies={companies} />
    </>
  );
}
