'use client'

import { Settings, User } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils/cn'

export function Topbar() {
  return (
    <header className="flex items-center justify-end px-8 h-16 shrink-0 bg-white border-b border-[#E5E5E5] relative z-40">
      <div className="flex items-center gap-x-5">
        <Link href="/configuracoes">
          <button 
            className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all group"
            title="Configurações"
          >
            <Settings size={20} className="group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </Link>

        <Link href="/configuracoes?tab=perfil">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm cursor-pointer font-montserrat shadow-md hover:ring-4 hover:ring-primary/10 transition-all">
            M
          </div>
        </Link>
      </div>
    </header>
  )
}
