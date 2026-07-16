import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectGalleryView } from '@/components/projects/ProjectGalleryView';

interface PageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function ProjectGalleryPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const role = session.user.role;
  const isAuthorized = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'].includes(role);
  if (!isAuthorized) {
    redirect('/');
  }

  // Fetch the project and its hierarchy to gather filter lists
  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
    },
    include: {
      domains: {
        include: {
          tasks: {
            include: {
              subtasks: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Build tasks and subtasks filter list
  const filterTasks: { id: string; title: string }[] = [];
  const filterSubtasks: { id: string; title: string }[] = [];

  project.domains.forEach((domain) => {
    domain.tasks.forEach((task) => {
      filterTasks.push({ id: task.id, title: task.title });
      task.subtasks.forEach((sub) => {
        filterSubtasks.push({ id: sub.id, title: sub.title });
      });
    });
  });

  // Fetch users for uploader filtering
  const uploaders = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <ProjectGalleryView
      projectId={project.id}
      projectName={project.name}
      tasks={filterTasks}
      subtasks={filterSubtasks}
      uploaders={uploaders}
      currentUserRole={role}
    />
  );
}
