'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, FolderKanban, Building2, Users, Settings,
  ChevronRight, LogOut, Moon, Sun, Zap, UserCircle, UsersRound, Wallet, ReceiptText, Scale,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn, getInitials, ROLE_CONFIG } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Role } from '@/types';

const navItems = [
  { href: '/board',     label: 'Project Board', icon: LayoutDashboard, roles: ['ADMIN','MANAGER','EMPLOYEE','CLIENT'] },
  { href: '/projects',  label: 'Projects',      icon: FolderKanban,   roles: ['ADMIN','MANAGER','EMPLOYEE','CLIENT'] },
  { href: '/companies', label: 'Companies',     icon: Building2,      roles: ['ADMIN','MANAGER'] },
  { href: '/ledger',    label: 'Finances',      icon: Wallet,        roles: ['ADMIN','MANAGER'] },
  { href: '/finance/statements', label: 'Statements', icon: Scale,   roles: ['ADMIN','MANAGER'] },
  { href: '/overheads', label: 'Overheads',     icon: ReceiptText,   roles: ['ADMIN','MANAGER'] },
  { href: '/teams',     label: 'Teams',         icon: UsersRound,     roles: ['ADMIN','MANAGER'] },
  { href: '/team',      label: 'Members',       icon: Users,          roles: ['ADMIN','MANAGER'] },
  { href: '/settings',  label: 'Settings',      icon: Settings,       roles: ['ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const role = session?.user?.role as Role;

  const allowed = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo - links to the Project Board */}
      <Link
        href="/board"
        className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/60 hover:bg-sidebar-accent/40 transition-colors"
        title="Go to Project Board"
      >
        <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0">
          <img src="/favicon.svg" alt="ICONA logo" className="h-full w-full object-cover" />
        </div>
        <div>
          <div className="font-bold text-sm text-sidebar-foreground leading-none">ICON ERP</div>
          <div className="text-[10px] text-slate-500 font-medium tracking-widest uppercase mt-0.5">Services</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="mb-3 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Navigation</span>
        </div>
        {allowed.map((item) => {
          const Icon = item.icon;
          // Match on full path segments so "/teams" does not also activate "/team".
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300')} />
                {item.label}
              </div>
              {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border/60 p-3 space-y-2">
        <Button
          variant="ghost" size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 px-3"
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-amber-400" />
            : <Moon className="h-4 w-4 text-slate-400" />}
          <span className="text-sm">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </Button>

        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-sidebar-accent/60 transition-colors group"
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-indigo-500/20 text-indigo-400">
              {getInitials(session?.user?.name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{session?.user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <UserCircle className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              onClick={(e) => { e.preventDefault(); signOut({ callbackUrl: '/login' }); }}
              className="text-slate-600 hover:text-rose-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </Link>

        {role && ROLE_CONFIG[role] && (
          <div className={cn('text-center text-xs font-medium py-1 rounded-md', ROLE_CONFIG[role].color)}>
            {ROLE_CONFIG[role].label}
          </div>
        )}
      </div>
    </aside>
  );
}
