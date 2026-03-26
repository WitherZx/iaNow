'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Download,
  Copy,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Pencil,
  Save,
  X,
  Send,
  RefreshCcw,
  Clock,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { DocumentActionBar } from '@/components/shared/DocumentActionBar'
import { DocumentHero } from '@/components/shared/DocumentHero'
import { DocumentAuditLayout } from '@/components/shared/DocumentAuditLayout'
import { SidebarActionItem } from '@/components/shared/SidebarActionItem'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'

export default function ViewDocumentPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [resolvedSuggestions, setResolvedSuggestions] = useState<string[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [activeToken, setActiveToken] = useState<string | null>(null)

  const scrollToToken = (token: string) => {
    setActiveToken(token)
    setTimeout(() => {
      const id = `token-${token.replace(/[\[\]]/g, '')}`
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('animate-pulse', 'ring-4', 'ring-primary/40', 'bg-primary/20')
        setTimeout(() => {
          el.classList.remove('animate-pulse', 'ring-4', 'ring-primary/40', 'bg-primary/20')
          setActiveToken(null)
        }, 3000)
      } else {
        setActiveToken(null)
      }
    }, 100)
  }

  const renderTextWithHighlights = (text: string) => {
    if (!text) return null
    const parts = text.split(/(\[.*?\])/g)
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const tokenCleanup = part.replace(/[\[\]]/g, '')
        const isActive = activeToken === part
        return (
          <span 
            key={i} 
            id={`token-${tokenCleanup}`}
            className={cn(
              "transition-all duration-500 rounded px-1.5 py-0.5 font-bold cursor-help border",
              isActive 
                ? "bg-primary text-white border-primary shadow-lg scale-110 z-10" 
                : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
            )}
            title={`Variável: ${tokenCleanup}`}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    async function loadDocument() {
      if (!id) return
      try {
        const { data, error } = await supabase
          .from('generated_documents')
          .select('*')
          .eq('id', id)
          .single() as any

        if (error) throw error
        setDoc(data)
        setEditContent(data.content || '')

        // Stop polling if no longer generating
        if (data.status !== 'generating' && interval) {
          clearInterval(interval)
          interval = null
        }
      } catch (err) {
        console.error('Erro ao carregar documento:', err)
        if (interval) clearInterval(interval)
      } finally {
        setLoading(false)
      }
    }

    // Initial load
    loadDocument()

    // Poll every 4s — will stop once status changes
    interval = setInterval(loadDocument, 4000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [id])

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('generated_documents')
        .update({ content: editContent })
        .eq('id', id)

      if (error) throw error

      setDoc({ ...doc, content: editContent })
      setIsEditing(false)
      toast.success('Documento atualizado com sucesso!')
    } catch (err) {
      console.error('Erro ao salvar:', err)
      toast.error('Erro ao salvar alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !window.confirm('Excluir este documento?')) return
    try {
      const { error: upError } = await supabase
        .from('generated_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id as string)
      
      if (upError) {
        const { error: delError } = await supabase
          .from('generated_documents')
          .delete()
          .eq('id', id as string)
        if (delError) throw delError
      }
      
      toast.success('Documento excluído!')
      router.push('/juridico')
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || 'Sem permissão'))
    }
  }

  const handleRefine = async (customPrompt?: string) => {
    const promptToUse = (typeof customPrompt === 'string') ? customPrompt : refinePrompt
    if (!promptToUse.trim() || refining) return

    if (customPrompt) setResolvedSuggestions(prev => [...prev, customPrompt])

    setRefining(true)
    const toastId = toast.loading('Processando ajustes com IA...')

    try {
      const response = await fetch('/api/juridico/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refineContent: doc.content,
          prompt: promptToUse,
          documentId: id,
          skipAudit: true
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao refinar')

      setDoc({ ...doc, content: data.content })
      setEditContent(data.content)
      if (!customPrompt) setRefinePrompt('')

      toast.success('Ajustes aplicados!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar ajustes.', { id: toastId })
    } finally {
      setRefining(false)
    }
  }

  const handleReaudit = async () => {
    if (refining) return
    setRefining(true)
    const toastId = toast.loading('Reavaliando blindagem jurídica...')
    try {
      const response = await fetch('/api/juridico/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refineContent: doc.content,
          prompt: "Mantenha o texto EXATAMENTE como está, mas execute uma nova auditoria de compliance completa e retorne o score e sugestões atualizadas.",
          documentId: id
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro na reavaliação')

      setDoc({ ...doc, metadata: { ...doc.metadata, audit: data.audit } })
      setResolvedSuggestions([])
      toast.success('Auditoria atualizada!', { id: toastId })
    } catch (err: any) {
      toast.error('Falha ao reavaliar.', { id: toastId })
    } finally {
      setRefining(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full w-full items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!doc) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">Documento não encontrado</h2>
            <p className="text-slate-500 mt-2">O documento que você tentou acessar não existe ou foi removido.</p>
            <Link href="/juridico" className="mt-8">
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Jurídico</Button>
            </Link>
          </div>
        </PageContainer>
      </DashboardLayout>
    )
  }

  const isGenerating = doc.status === 'generating'
  const isFailed = doc.status === 'failed'
  const audit = doc.metadata?.audit

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-100'
    if (score >= 50) return 'text-amber-500 bg-amber-50 border-amber-100'
    return 'text-red-500 bg-red-50 border-red-100'
  }

  return (
    <DocumentAuditLayout
      backLink="/juridico"
      actions={
        <DocumentActionBar
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
          isSaving={saving}
          onCopy={() => {
            navigator.clipboard.writeText(doc.content || '')
            toast.success('Conteúdo copiado!')
          }}
          onDownload={() => window.print()}
          onDelete={handleDelete}
        />
      }
      hero={
        <DocumentHero
          category={doc.document_type === 'contract' ? 'Contrato' : doc.document_type === 'company_structure' ? 'Societário' : 'Compliance'}
          date={new Date(doc.created_at).toLocaleDateString('pt-BR')}
          title={doc.title}
          description={doc.metadata?.description || 'Documento jurídico gerado e auditado com inteligência artificial para máxima segurança e conformidade.'}
        />
      }
      sidebar={
        <>
          {/* AJUSTAR COM IA */}
          <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <Zap className="w-4 h-4 fill-primary" /> Ajustar com IA
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Descreva o que deseja mudar ou adicionar ao documento.</p>
            <div className="relative">
              <textarea
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder="Ex: Adicione uma cláusula de confidencialidade de 2 anos..."
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none h-32 font-semibold text-slate-700 placeholder:text-slate-400"
              />
              <Button
                size="icon"
                onClick={() => handleRefine()}
                disabled={!refinePrompt.trim() || refining}
                className="absolute bottom-3 right-3 rounded-xl shadow-lg shadow-primary/20 h-10 w-10 bg-primary hover:bg-blue-700 flex items-center justify-center p-0"
              >
                {refining ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </Button>
            </div>
          </div>

          {/* SCORE E RISCO */}
          {audit && (
            <Card padding="none" className="p-6 bg-white border-slate-100 shadow-sm rounded-3xl flex flex-col items-center">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2",
                getScoreColor(audit.score).split(' ')[0],
                getScoreColor(audit.score).split(' ')[1]
              )}>
                <span className="text-3xl font-black">{audit.score}</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Score de Compliance</span>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div className={cn(
                  "h-full transition-all duration-1000",
                  audit.score >= 80 ? "bg-emerald-500" : audit.score >= 50 ? "bg-amber-500" : "bg-red-500"
                )} style={{ width: `${audit.score}%` }} />
              </div>
              <div className="px-3 py-1.5 bg-slate-50 rounded-xl flex items-center gap-2 w-full justify-center mb-3">
                <span className={`w-2 h-2 rounded-full ${audit.risk_level === 'baixo' ? 'bg-emerald-500' : audit.risk_level === 'médio' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Risco {audit.risk_level}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReaudit}
                disabled={refining}
                className="w-full text-xs font-black uppercase text-primary hover:bg-primary/5 rounded-xl h-10 gap-2"
              >
                <RefreshCcw className={cn("w-3.5 h-3.5", refining && "animate-spin")} />
                Reavaliar Blindagem
              </Button>
            </Card>
          )}
        {/* SUGESTÕES */}
          {audit?.suggestions?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <Sparkles className="w-3 h-3" /> Sugestões Críticas
              </div>
              {audit.suggestions
                .filter((s: string) => !resolvedSuggestions.includes(s))
                .map((s: string, i: number) => (
                  <SidebarActionItem
                    key={i}
                    icon={<CheckCircle2 size={16} className="text-emerald-500" />}
                    text={s}
                    onAction={() => handleRefine(s)}
                    isLoading={refining}
                    variant="primary"
                  />
                ))}
            </div>
          )}

          {/* CAMPOS DINÂMICOS */}
          {!isGenerating && !isEditing && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400">
                <Pencil className="w-3.5 h-3.5" /> Preencher Variáveis
              </div>
              
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                {(() => {
                  const tokens = Array.from(new Set(doc.content?.match(/\[(.*?)\]/g) || [])) as string[]
                  if (tokens.length === 0) return <p className="text-[10px] text-slate-400 text-center py-2 font-bold uppercase tracking-wider">Nenhum campo variável detectado</p>
                  
                  return (
                    <>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {tokens.map((token: string) => {
                          const rawLabel = token.slice(1, -1)
                          // Mapeamento de labels comuns para serem mais amigáveis e evitar confusão
                          const labelMap: Record<string, string> = {
                            'DATA': 'Data de assinatura',
                            'LOCAL': 'Cidade/UF',
                            'VALOR': 'Valor do contrato',
                            'FORO': 'Comarca de eleição',
                            'INSERIR DADOS BANCÁRIOS': 'Dados bancários para pagamento',
                            'ESPECIFICAR FORMA DE PAGAMENTO': 'Forma de pagamento (Pix, Transferência...)',
                            'OPERADOR/CONTROLADOR': 'Papel na LGPD (Ex: Controlador ou Operador)'
                          }
                          const label = labelMap[rawLabel.toUpperCase()] || rawLabel

                          const isDate = rawLabel.toUpperCase() === 'DATA'

                          const handleInputChange = (val: string) => {
                            let formatted = val
                            if (isDate) {
                              const digits = val.replace(/\D/g, '').substring(0, 8)
                              if (digits.length <= 2) formatted = digits
                              else if (digits.length <= 4) formatted = `${digits.substring(0, 2)}/${digits.substring(2)}`
                              else formatted = `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`
                            }
                            setFieldValues((prev: Record<string, string>) => ({ ...prev, [token]: formatted }))
                          }

                          return (
                            <div key={token} className="space-y-1.5 group/var">
                              <button 
                                onClick={() => scrollToToken(token)}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 ml-1 hover:text-primary transition-colors text-left"
                              >
                                {label}
                                <ExternalLink size={10} className="opacity-0 group-hover/var:opacity-100 transition-opacity" />
                              </button>
                              <input
                                type="text"
                                placeholder={isDate ? new Date().toLocaleDateString('pt-BR') : `...`}
                                value={fieldValues[token] || ''}
                                onChange={(e) => handleInputChange(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-10 text-[12px] font-medium focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-700 placeholder:text-slate-300"
                              />
                            </div>
                          )
                        })}
                      </div>
                      <Button
                        onClick={async () => {
                          const filledData = Object.entries(fieldValues)
                            .filter(([_, v]) => v.trim())
                            .map(([k, v]) => `${k}: ${v}`)
                            .join('\n')
                          
                          if (!filledData) return

                          const aiPrompt = `Por favor, preencha as variáveis abaixo no contrato de forma contextualizada. Integre as informações no texto removendo os colchetes e garantindo que o fluxo jurídico e a gramática estejam perfeitos:\n\n${filledData}\n\nLembre-se: Remova também qualquer bloco de assinatura ou data ao final do documento, conforme as novas diretrizes de assinatura digital.`
                          
                          await handleRefine(aiPrompt)
                          setFieldValues({})
                        }}
                        disabled={Object.values(fieldValues).filter(v => v.trim()).length === 0 || refining || saving}
                        className="w-full rounded-xl bg-slate-900 text-white font-black text-[11px] h-11 hover:bg-black transition-all shadow-lg shadow-slate-200"
                      >
                        {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar Alterações'}
                      </Button>
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </>
      }
    >
      <div className="min-w-0 flex flex-col">
        {!isGenerating && !isFailed && (
          <Card className="min-h-[600px] border-none shadow-2xl shadow-slate-200/50 rounded-[20px] md:rounded-[32px] overflow-hidden bg-white flex flex-col relative print:min-h-0 print:h-auto print:shadow-none print:border-none print:rounded-none">
            {isEditing ? (
              <div className="flex-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-[800px] border-none focus:ring-0 text-base md:text-lg text-slate-700 leading-relaxed font-mono whitespace-pre-wrap outline-none resize-none p-4 md:p-8"
                  placeholder="Edite o conteúdo do contrato..."
                />
              </div>
            ) : (
              <div className="flex-1 p-4 md:p-8 print:p-0 prose prose-slate max-w-none whitespace-normal break-words prose-headings:font-black prose-h1:text-2xl md:prose-h1:text-3xl prose-h2:text-xl md:prose-h2:text-2xl prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 text-sm sm:text-base md:text-lg overflow-hidden">
                <ReactMarkdown
                  components={{
                    li: ({node, children, ...props}) => (
                      <li className="break-words whitespace-normal" {...props}>
                        {Array.isArray(children) 
                          ? children.map((c, i) => typeof c === 'string' ? <React.Fragment key={i}>{renderTextWithHighlights(c)}</React.Fragment> : c)
                          : typeof children === 'string' ? renderTextWithHighlights(children) : children
                        }
                      </li>
                    ),
                    p: ({node, children, ...props}) => (
                      <p className="break-words whitespace-normal" {...props}>
                        {Array.isArray(children) 
                          ? children.map((c, i) => typeof c === 'string' ? <React.Fragment key={i}>{renderTextWithHighlights(c)}</React.Fragment> : c)
                          : typeof children === 'string' ? renderTextWithHighlights(children) : children
                        }
                      </p>
                    ),
                    blockquote: ({node, children, ...props}) => (
                      <blockquote className="break-words whitespace-normal" {...props}>
                        {Array.isArray(children) 
                          ? children.map((c, i) => typeof c === 'string' ? <React.Fragment key={i}>{renderTextWithHighlights(c)}</React.Fragment> : c)
                          : typeof children === 'string' ? renderTextWithHighlights(children) : children
                        }
                      </blockquote>
                    )
                  }}
                >
                  {doc.content?.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') || ''}
                </ReactMarkdown>
              </div>
            )}
          </Card>
        )}

        {isGenerating && (
          <div className="flex-1 bg-white rounded-[32px] border border-slate-100 p-8 md:p-20 flex flex-col items-center justify-center text-center shadow-xl shadow-slate-100">
            <div className="relative mb-6 md:mb-10">
              <div className="w-20 h-20 md:w-24 md:h-24 border-4 border-slate-100 rounded-full animate-spin border-t-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-7 h-7 md:w-8 md:h-8 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 md:mb-4">Gerando Blindagem Legal...</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              Nossa Inteligência Sistêmica está redigindo seu documento aplicando todo o contexto jurídico. Por favor, aguarde alguns instantes.
            </p>
          </div>
        )}

        {isFailed && (
          <div className="flex-1 bg-white rounded-[32px] border border-slate-100 p-8 md:p-20 flex flex-col items-center justify-center text-center shadow-xl shadow-slate-100">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 md:mb-8">
              <AlertCircle className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 md:mb-4">Falha na Geração</h3>
            <p className="text-slate-500 font-medium mb-6 md:mb-10">{doc.content || 'Ocorreu um erro ao processar o contrato.'}</p>
            <Link href="/juridico/novo">
              <Button size="lg" className="rounded-2xl px-10 font-bold">Tentar Novamente</Button>
            </Link>
          </div>
        )}
      </div>
    </DocumentAuditLayout>
  )
}
