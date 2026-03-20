'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Lightbulb, Scale, LineChart,
  FileText, Users, LogOut, Gavel, PlayCircle, Share2
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { supabase } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard',        label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/estrategia',       label: 'Estratégia',    icon: Lightbulb },
  { href: '/juridico',         label: 'Jurídico',      icon: Scale },
  { href: '/justica',          label: 'Jus Postulandi', icon: Gavel },
  { href: '/financeiro',       label: 'Financeiro',    icon: LineChart },
  { href: '/pessoas',          label: 'Gestão de Pessoas', icon: Users },
  { href: '/parceiros',        label: 'Partner Hub',   icon: PlayCircle },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex flex-col w-[240px] shrink-0 bg-slate-950 py-6 h-screen border-r border-white/5">
      {/* Logo */}
      <div className="px-5 mb-8 flex items-center gap-[10px]">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          iN
        </div>
        <span className="text-white font-bold text-lg font-montserrat tracking-tight">iaNow</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 gap-y-[2px] px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link 
              key={href} 
              href={href} 
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
