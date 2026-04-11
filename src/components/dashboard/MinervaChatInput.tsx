'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ArrowRight, Send, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'

interface MinervaChatInputProps {
  onSendMessage: (content: string) => void
  isProcessing: boolean
  placeholder?: string
}

export const MinervaChatInput: React.FC<MinervaChatInputProps> = ({
  onSendMessage,
  isProcessing,
  placeholder = "Fale com a Minerva..."
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isMultiline, setIsMultiline] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (inputValue.trim() && !isProcessing) {
      onSendMessage(inputValue.trim())
      setInputValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        setIsMultiline(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    
    // Auto-expand logic
    const target = e.target
    target.style.height = 'auto'
    const newHeight = Math.min(target.scrollHeight, 150)
    target.style.height = `${newHeight}px`
    setIsMultiline(newHeight > 64)
  }

  return (
    <div className="relative group p-0">
      {/* Visual background glow on focus */}
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r from-primary/20 via-blue-500/10 to-primary/20 rounded-[28px] blur-xl transition-opacity duration-500 opacity-0 group-focus-within:opacity-100",
        isProcessing && "animate-pulse"
      )} />

      <div className="relative flex items-end gap-2 bg-white border border-slate-200 focus-within:border-primary shadow-sm focus-within:shadow-xl focus-within:shadow-primary/5 rounded-[24px] px-2 py-2 transition-all duration-300">
        <div className="absolute left-6 bottom-5 text-slate-300 group-focus-within:text-primary transition-colors duration-300">
          <Sparkles size={18} />
        </div>

        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isProcessing}
          rows={1}
          className="block w-full pl-12 pr-14 py-3 bg-transparent text-sm sm:text-base outline-none transition-all font-medium resize-none overflow-y-auto min-h-[48px] max-h-[150px] text-slate-700 placeholder:text-slate-300"
        />

        <button
          onClick={handleSend}
          disabled={isProcessing || !inputValue.trim()}
          className={cn(
            "absolute right-2 p-2.5 sm:p-3 bg-slate-900 text-white rounded-[20px] hover:bg-primary transition-all active:scale-95 disabled:opacity-30 shadow-md shadow-slate-200 duration-200 flex items-center justify-center",
            isMultiline ? "bottom-2" : "top-1/2 -translate-y-1/2"
          )}
        >
          {isProcessing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ArrowRight size={18} />
          )}
        </button>
      </div>
    </div>
  )
}
