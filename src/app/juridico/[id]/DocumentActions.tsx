'use client'

import { useState } from 'react'
import { Copy, Download, Check, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function DocumentActions({ id, content, title }: { id: string, content: string, title: string }) {
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch(e) {
      console.error(e)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja apagar este documento permanentemente?')) return
    
    try {
      setDeleting(true)
      const response = await fetch('/api/juridico/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error('Falha ao deletar')
      }
      
      router.push('/juridico')
      router.refresh()
    } catch (err) {
      console.error('Erro ao deletar:', err)
      alert('Ocorreu um erro ao apagar o documento.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 print:hidden">
      <Button variant="outline" onClick={handleCopy} className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
        {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />} 
        {copied ? 'Copiado!' : 'Copiar'}
      </Button>

      <Button onClick={handleDelete} disabled={deleting} variant="outline" className="h-12 px-4 rounded-2xl border-red-100 text-red-500 font-bold hover:bg-red-50 hover:border-red-200">
        {deleting ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4 text-red-500" />}
      </Button>

      <Button onClick={() => window.print()} className="h-12 px-6 rounded-2xl bg-primary text-white font-bold hover:bg-blue-700 shadow-xl shadow-primary/20">
         <Download className="w-4 h-4 mr-2" /> Exportar PDF
      </Button>
    </div>
  )
}
