'use client'

import { Menu, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils/cn'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="flex items-center justify-between px-6 lg:px-8 h-16 shrink-0 bg-white border-b border-[#E5E5E5] relative z-40">
      <div className="flex items-center gap-x-4">
        {/* Hamburger Menu - Visible on mobile/tablet */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Logo para mobile (opcional, já que tem na sidebar, mas as vezes é bom) */}
        <div className="lg:hidden">
          <img src="/logo.webp" alt="iaNow" className="h-7 w-auto" />
        </div>
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

        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm font-montserrat shadow-md">
          M
        </div>
      </div>
    </header>
  )
}
