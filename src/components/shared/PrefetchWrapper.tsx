'use client'

import React from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function PrefetchWrapper({ children, queryKey, queryFn }: { children: React.ReactNode; queryKey: any[]; queryFn: () => Promise<any> }) {
  const queryClient = useQueryClient()
  return (
    <div 
      className="contents" 
      onMouseEnter={() => queryClient.prefetchQuery({ queryKey, queryFn })} 
      onFocus={() => queryClient.prefetchQuery({ queryKey, queryFn })}
    >
      {children}
    </div>
  )
}
