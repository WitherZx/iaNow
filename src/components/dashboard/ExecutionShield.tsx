'use client'

import React from 'react'
import { Play, ShieldCheck, Lightbulb, Scale, Gavel, LineChart, Users, FileText, Share2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ExecutionShieldProps {
  className?: string
  onClick?: () => void
}

const ORBIT_MODULES = [
  { icon: Lightbulb, label: 'Consult', delay: '0s' },
  { icon: Scale, label: 'Legal', delay: '0.4s' },
  { icon: Gavel, label: 'Jus Postulandi', delay: '0.8s' },
  { icon: LineChart, label: 'Finance', delay: '1.2s' },
  { icon: Share2, label: 'Hub', delay: '1.6s' },
  { icon: FileText, label: 'Reports', delay: '2.0s' },
  { icon: Users, label: 'People', delay: '2.4s' },
]

export function ExecutionShield({ className, onClick }: ExecutionShieldProps) {
  return (
    <div className={cn("relative flex items-center justify-center p-4 sm:p-8 md:p-12 max-w-full overflow-hidden", className)} onClick={onClick}>
      {/* Background Aura */}
      <div className="absolute w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] opacity-50" />
      
      {/* Main Container */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center group cursor-pointer">
        
        {/* Orbital Ring - Thin Blue */}
        <div className="absolute inset-0 rounded-full border border-primary/10 animate-[spin_20s_linear_infinite]" />
        
        {/* Glassmorphic Outer Ring */}
        <div className="absolute inset-8 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm shadow-2xl transition-transform duration-700 group-hover:scale-105" />
        
        {/* 7 Points of Intelligence - Orbiting */}
        <div className="absolute inset-0 animate-[spin_30s_linear_infinite]">
          {ORBIT_MODULES.map((module, idx) => {
            const angle = (idx * 360) / 7
            return (
              <div 
                key={idx}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  transform: `rotate(${angle}deg) translateY(-140px) rotate(-${angle}deg)`
                }}
              >
                <div className="flex flex-col items-center animate-[spin-reverse_30s_linear_infinite]">
                  <div className="w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/30 transition-all duration-300">
                    <module.icon size={14} />
                  </div>
                  <span className="absolute mt-10 text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap left-1/2 -translate-x-1/2 text-center">
                    {module.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Central Core - The Execution Shield */}
        <div className="relative w-48 h-48 rounded-full flex items-center justify-center">
          {/* Animated Glow Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping duration-[4000ms]" />
          <div className="absolute inset-4 rounded-full border border-primary/10" />
          
          {/* Inner Blue Core */}
          <div className="relative w-36 h-36 rounded-full bg-white shadow-[0_20px_50px_rgba(37,99,235,0.15)] border-4 border-slate-50 flex items-center justify-center transition-all duration-500 group-hover:shadow-[0_20px_60px_rgba(37,99,235,0.3)]">
            
            {/* Shield Icon - Elegant Blue Gradient */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-blue-600 to-blue-800 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck size={48} className="text-white fill-white/10 animate-pulse" />
            </div>


          </div>
        </div>

        {/* Subtle Lens Flare / Highlights */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  )
}
