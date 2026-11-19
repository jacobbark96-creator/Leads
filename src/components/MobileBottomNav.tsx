import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, User, Home, Database, Briefcase, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileBottomNavProps {
  navItems: any[];
  onMenuClick: () => void;
  isMenuOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ navItems, onMenuClick, isMenuOpen }) => {
  const pathname = usePathname();

  // Pick up to 4 main items from navItems
  // Prioritize Home, CRM, Map, Partner+, etc.
  const topItems = navItems.slice(0, 4);

  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-2">
        {topItems.map((item) => {
          const Icon = item.icon || Home;
          const isActive = pathname === item.path || (item.children && item.children.some((child: any) => pathname?.startsWith(child.path)));
          
          // If it has children and no direct path, maybe we should open the menu instead?
          // For now, if it's CRM, we can link to the first child or just let it open menu.
          const href = item.path !== '#' ? item.path : (item.children?.[0]?.path || '#');

          return (
            <Link
              key={item.name}
              href={href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-blue-100/50' : ''}`} />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Menu Toggle */}
        <button
          onClick={onMenuClick}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isMenuOpen ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Menu className={`w-6 h-6 ${isMenuOpen ? 'fill-blue-100/50' : ''}`} />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </button>
      </div>
    </div>
  );
};
