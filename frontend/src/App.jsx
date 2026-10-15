import { Routes, Route, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import RunsList from './pages/RunsList';
import RunDetail from './pages/RunDetail';
import FlakyTests from './pages/FlakyTests';
import TestCases from './pages/TestCases';
import TestCaseDetail from './pages/TestCaseDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import AppSidebar, { NAV_ITEMS } from './components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

function pageTitle(pathname) {
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  if (match) return match.label;
  if (pathname.startsWith('/runs/')) return 'Run Detail';
  if (pathname.startsWith('/testcases/')) return 'Test Case Detail';
  return 'Dashboard';
}

function DashboardShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r md:flex">
        <AppSidebar className="w-64" />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <h1 className="text-sm font-semibold">{pageTitle(location.pathname)}</h1>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/runs" element={<RunsList />} />
            <Route path="/runs/:id" element={<RunDetail />} />
            <Route path="/flaky" element={<FlakyTests />} />
            <Route path="/testcases" element={<TestCases />} />
            <Route path="/testcases/:id" element={<TestCaseDetail />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
