import { NavLink } from 'react-router-dom';
import { FlaskConical, LayoutDashboard, ListChecks, LogOut, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ThemeToggle from '@/components/theme-toggle';

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/runs', label: 'Runs', icon: ListChecks },
  { to: '/flaky', label: 'Flaky Tests', icon: TriangleAlert },
  { to: '/testcases', label: 'Test Cases', icon: FlaskConical }
];

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AppSidebar({ onNavigate, className }) {
  const { user, logout } = useAuth();

  return (
    <div className={cn('flex h-full flex-col bg-sidebar text-sidebar-foreground', className)}>
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FlaskConical className="size-4" />
        </div>
        <span className="text-sm font-semibold">Test Automation</span>
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="flex items-center gap-2 p-3">
        <Avatar className="size-8">
          <AvatarFallback>{initials(user?.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user?.name}</div>
          <div className="truncate text-xs text-sidebar-foreground/60">{user?.email}</div>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" title="Log out" onClick={logout}>
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}
