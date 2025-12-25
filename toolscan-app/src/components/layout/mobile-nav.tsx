'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Package, History, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  iconName: string;
  roles: string[];
}

interface MobileNavProps {
  userRole: string;
}

// Map icon names to icon components
const iconMap = {
  Home,
  Package,
  History,
  Users,
  BarChart3,
};

const allNavigation: NavigationItem[] = [
  { name: 'Mes armoires', href: '/dashboard', iconName: 'Home', roles: ['user', 'admin', 'super_admin'] },
  { name: 'Gestion', href: '/dashboard/cabinets', iconName: 'Package', roles: ['user', 'admin', 'super_admin'] },
  { name: 'Historique', href: '/dashboard/verifications', iconName: 'History', roles: ['admin', 'super_admin'] },
  { name: 'Analytiques', href: '/dashboard/analytics', iconName: 'BarChart3', roles: ['admin', 'super_admin'] },
  { name: 'Utilisateurs', href: '/dashboard/settings/team', iconName: 'Users', roles: ['admin', 'super_admin'] },
];

export function MobileNav({ userRole }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item =>
    item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMenu}
          className="bg-background"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeMenu}
        />
      )}

      {/* Mobile menu content */}
      <div
        className={cn(
          'lg:hidden fixed top-0 left-0 z-40 h-full w-64 bg-background border-r transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex flex-col h-full pt-20 px-4">
          <div className="flex-1 space-y-1">
            {navigation.map((item) => {
              const Icon = iconMap[item.iconName as keyof typeof iconMap];
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
