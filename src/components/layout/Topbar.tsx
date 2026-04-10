'use client'

import { Menu, Settings, Lock, Scale } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { NAV_ITEMS } from '@/constants/navigation'
import { usePathname } from 'next/navigation'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { isAuthenticated, user } = useAuth()
  const pathname = usePathname()
  const initial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'V'

  return (
    <header className="flex items-center justify-between px-6 lg:px-8 h-16 shrink-0 bg-white relative z-40 w-full max-w-[1912px] mx-auto shadow-sm">
      <div className="flex items-center gap-x-4">
        {/* Hamburger Menu - Visible on mobile/tablet */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Logo and Branding - Desktop */}
        <div className="hidden lg:flex items-center pr-6 mr-2 border-r border-slate-300">
          <Link href="/dashboard" className="flex items-center gap-x-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <Scale size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-x-0.5">
              <span className="text-xl font-black text-slate-900 tracking-tighter transition-all group-hover:tracking-tight">ia</span>
              <span className="text-xl font-black text-primary tracking-tighter transition-all group-hover:tracking-tight">Now</span>
            </div>
          </Link>
        </div>

        {/* Logo for mobile */}
        <div className="lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-x-2 group">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <Scale size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-x-0.5">
              <span className="text-lg font-black text-slate-900 tracking-tighter">ia</span>
              <span className="text-lg font-black text-primary tracking-tighter">Now</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-x-1">
          {NAV_ITEMS.map((item) => {
            const { href, label, icon: Icon } = item;
            const isLockedByDef = 'locked' in item ? item.locked : false;
            const locked = isLockedByDef;
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

            if (locked) {
              return (
                <div
                  key={href}
                  className="flex items-center gap-x-2 px-3 py-1.5 text-slate-400 opacity-40 cursor-not-allowed select-none"
                >
                  <Icon size={16} strokeWidth={2.5} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                  <Lock size={10} strokeWidth={3} />
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-x-2 px-4 py-2 rounded-xl transition-all duration-300 group",
                  isActive
                    ? "bg-primary shadow-md shadow-primary/20 text-white z-10"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2.5} className={cn("transition-all duration-300", isActive ? "scale-110 text-white" : "group-hover:scale-110 group-hover:-translate-y-0.5")} />
                <span className={cn(
                  "text-[10px] uppercase tracking-[0.15em] transition-all",
                  isActive ? "font-black text-white" : "font-bold group-hover:text-slate-900"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-x-3 md:gap-x-5">
        <Link href="/configuracoes">
          <button
            className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all group"
            title="Configurações"
          >
            <Settings size={20} className="group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </Link>

        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm font-montserrat shadow-md overflow-hidden shrink-0 border border-slate-100">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
      </div>
    </header>
  )
}
