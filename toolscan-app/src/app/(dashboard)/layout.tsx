import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ScanLine, Home, Package, History, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { MobileNav } from '@/components/layout/mobile-nav';

// Define navigation items with role requirements
const allNavigation = [
  { name: 'Mes armoires', href: '/dashboard', icon: Home, roles: ['user', 'admin', 'super_admin'] },
  { name: 'Gestion', href: '/dashboard/cabinets', icon: Package, roles: ['user', 'admin', 'super_admin'] },
  { name: 'Historique', href: '/dashboard/verifications', icon: History, roles: ['admin', 'super_admin'] },
  { name: 'Analytiques', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin', 'super_admin'] },
  { name: 'Utilisateurs', href: '/dashboard/settings/team', icon: Users, roles: ['admin', 'super_admin'] },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user from database
  const user = await getCurrentDbUser();

  // If no user in database, redirect to onboarding with sync flag
  if (!user) {
    redirect('/onboarding?sync=true');
  }

  // If no tenant, redirect to onboarding
  if (!user.tenantId) {
    redirect('/onboarding');
  }

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item =>
    item.roles.includes(user?.role || 'user')
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile Navigation */}
      <MobileNav userRole={user.role} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-muted/40">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <ScanLine className="h-6 w-6" />
            <span className="text-xl font-bold">ToolScan</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.tenant?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Mobile header with logo */}
        <div className="lg:hidden flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6" />
            <span className="text-xl font-bold">ToolScan</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
