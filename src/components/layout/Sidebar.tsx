'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Lightbulb, Scale, LineChart,
  FileText, Users, LogOut, Gavel, PlayCircle, Share2, X, Lock, Landmark
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { supabase } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard',        label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/estrategia',       label: 'Estratégia',    icon: Lightbulb },
  { href: '/juridico',         label: 'Contratos',      icon: FileText },
  { href: '/justica',          label: 'Processos',     icon: Gavel },
  { href: '/parceiros',        label: 'Hub de Contatos', icon: Users },
  { href: '/financeiro',       label: 'Financeiro',    icon: LineChart, locked: true },
  { href: '/pessoas',          label: 'Gestão de Pessoas', icon: Share2, locked: true },
  { href: '/tributario',       label: 'Tributário',    icon: Landmark, locked: true },
] as const

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    onClose?.()
  }

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] bg-slate-950 py-6 h-screen border-r border-white/5 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Mobile Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white lg:hidden"
      >
        <X size={24} />
      </button>

      {/* Logo */}
      <div className="px-6 mb-8 flex items-center">
        <img 
          src="/logo.webp" 
          alt="iaNow" 
          className="h-10 w-auto object-contain brightness-0 invert opacity-90 hover:opacity-100 transition-opacity" 
        />
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 gap-y-[2px] px-3">
        {NAV_ITEMS.map((item) => {
          const { href, label, icon: Icon } = item;
          const locked = 'locked' in item ? item.locked : false;
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

          if (locked) {
            return (
              <div 
                key={href} 
                className="flex items-center justify-between px-3 py-[10px] rounded-lg text-sm transition-all duration-150 font-montserrat opacity-60 cursor-not-allowed"
                title="Módulo em breve"
              >
                <div className="flex items-center gap-x-3 text-white">
                  <Icon size={18} strokeWidth={2.5} className="text-white" />
                  <span className="font-bold">{label}</span>
                </div>
                <Lock size={14} className="text-white/70" strokeWidth={2.5} />
              </div>
            )
          }

          return (
            <Link 
              key={href} 
              href={href} 
              onClick={onClose}
              className={cn(
                "flex items-center gap-x-3 px-3 py-[10px] rounded-lg text-sm transition-all duration-150 font-montserrat",
                isActive 
                  ? "bg-primary text-white font-bold shadow-lg shadow-primary/30" 
                  : "text-white hover:bg-white/12 font-bold opacity-80 hover:opacity-100"
              )}
            >
              <Icon size={18} strokeWidth={2.5} className="text-white" />
              <span className="text-white">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Placeholder logout */}
      <div className="p-3 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-x-3 w-full px-3 py-[10px] rounded-lg bg-transparent border-none cursor-pointer text-slate-300 text-sm font-semibold font-montserrat hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} /> Sair
        </button>
      </div>

    </aside>
  )
}
