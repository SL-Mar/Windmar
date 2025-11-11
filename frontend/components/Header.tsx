'use client';

import { Ship, Navigation, TrendingDown, Settings } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Ship className="w-8 h-8 text-primary-400 group-hover:text-primary-300 transition-colors" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-ocean-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold maritime-gradient-text">
                WINDMAR
              </h1>
              <p className="text-xs text-gray-400">Maritime Route Optimizer</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink href="/" icon={<Navigation className="w-4 h-4" />}>
              Routes
            </NavLink>
            <NavLink href="/fuel-analysis" icon={<TrendingDown className="w-4 h-4" />}>
              Fuel Analysis
            </NavLink>
            <NavLink href="/vessel-config" icon={<Settings className="w-4 h-4" />}>
              Vessel Config
            </NavLink>
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">System Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white/5 transition-all group"
    >
      <span className="text-gray-400 group-hover:text-primary-400 transition-colors">
        {icon}
      </span>
      <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
        {children}
      </span>
    </Link>
  );
}
