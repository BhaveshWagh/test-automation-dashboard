import { Routes, Route, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import RunsList from './pages/RunsList';
import RunDetail from './pages/RunDetail';
import FlakyTests from './pages/FlakyTests';
import TestCases from './pages/TestCases';
import TestCaseDetail from './pages/TestCaseDetail';
import TestCaseForm from './pages/TestCaseForm';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AppSidebar, { NAV_ITEMS } from './components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

function pageTitle(pathname) {
  if (pathname === '/testcases/new') return 'New Test Case';
  if (pathname.startsWith('/testcases/') && pathname.endsWith('/edit')) return 'Edit Test Case';
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
      {/* Pinned to the viewport: always full height, never scrolls away with the page. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 self-start border-r border-sidebar-border md:flex">
        <AppSidebar className="w-full" />
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
        <header className="sticky top-0 z-30 flex h-[57px] shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <h1 className="text-sm font-semibold">{pageTitle(location.pathname)}</h1>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/runs" element={<RunsList />} />
            <Route path="/runs/:id" element={<RunDetail />} />
            <Route path="/flaky" element={<FlakyTests />} />
            <Route path="/testcases" element={<TestCases />} />
            <Route path="/testcases/new" element={<TestCaseForm />} />
            <Route path="/testcases/:id/edit" element={<TestCaseForm />} />
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
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
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
