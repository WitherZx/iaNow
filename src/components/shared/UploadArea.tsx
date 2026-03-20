'use client'

import { Upload, X, FileText } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useState, useRef } from 'react'

interface UploadAreaProps {
  onUpload: (files: File[]) => void
  accept?: string
  maxFiles?: number
  maxSizeMB?: number
}

export function UploadArea({ onUpload, accept, maxFiles = 1, maxSizeMB = 10 }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files))
    }
  }

  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(f => f.size <= maxSizeMB * 1024 * 1024)
    const limitedFiles = [...files, ...validFiles].slice(0, maxFiles)
    setFiles(limitedFiles)
    if (limitedFiles.length > 0) onUpload(limitedFiles)
  }

  return (
    <div className="flex flex-col gap-y-4 w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-y-4 cursor-pointer transition-all duration-200",
          isDragging ? "border-[#6C63FF] bg-[#6C63FF]/5 scale-[1.01]" : "border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#D4D4D4]"
        )}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleSelect} 
          accept={accept} 
          multiple={maxFiles > 1}
          className="hidden" 
        />
        <div className="w-12 h-12 rounded-full bg-[#6C63FF]/10 flex items-center justify-center text-[#6C63FF]">
          <Upload size={24} />
        </div>
        <div className="flex flex-col items-center gap-y-1">
          <p className="font-montserrat font-bold text-sm text-[#171717] m-0">
            Clique ou arraste arquivos aqui
          </p>
          <p className="font-montserrat text-[12px] text-[#A3A3A3] m-0">
            {accept ? `Arquivos ${accept}` : 'Qualquer arquivo'} até {maxSizeMB}MB
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-y-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E5E5E5]">
              <div className="flex items-center gap-x-3">
                <FileText size={18} className="text-[#6C63FF]" />
                <div className="flex flex-col">
                  <span className="font-montserrat text-sm font-semibold text-[#171717] truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="font-montserrat text-[10px] text-[#A3A3A3]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, i) => i !== idx)) }}
                className="p-1.5 rounded-md hover:bg-[#FEF2F2] hover:text-[#EF4444] text-[#A3A3A3] transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
