import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ScanLine, Home, Package, History, Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { getCurrentDbUser, hasTenant } from '@/lib/clerk/utils';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Armoires', href: '/dashboard/cabinets', icon: Package },
  { name: 'Vérifications', href: '/dashboard/verifications', icon: History },
  { name: 'Analytiques', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
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

  // Check if user has a tenant, if not redirect to onboarding
  const userHasTenant = await hasTenant();
  if (!userHasTenant) {
    redirect('/onboarding');
  }

  const user = await getCurrentDbUser();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40">
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
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
