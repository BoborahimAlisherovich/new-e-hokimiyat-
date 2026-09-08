"use client"

import { ArrowLeft, Upload, X, FileText, Image as ImageIcon, File, Camera } from "lucide-react"
import type { TaskFormData } from "@/app/dashboard/tasks/new/page"
import { useRef, useState } from "react"

type Step4Props = {
  data: TaskFormData
  onUpdate: (updates: Partial<TaskFormData>) => void
  onNext: () => void
  onBack: () => void
}

export function Step4Files({ data, onUpdate, onNext, onBack }: Step4Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFiles(e.dataTransfer.files)
  }

  const handleFiles = (fileList: FileList) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg", "image/png", "image/jpg", "image/heic"
    ]
    const newFiles = Array.from(fileList).filter(f => validTypes.includes(f.type) || f.name.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|heic)$/i))
    onUpdate({ files: [...data.files, ...newFiles] })
  }

  const removeFile = (index: number) => {
    onUpdate({ files: data.files.filter((_, i) => i !== index) })
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-violet-500" />
    if (file.type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />
    return <File className="h-5 w-5 text-blue-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / 1048576).toFixed(1) + " MB"
  }

  const getFileExt = (name: string) => name.split(".").pop()?.toUpperCase() || "FILE"

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-xl font-bold text-slate-900">Fayllar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hujjat, rasm yoki boshqa fayllarni qo'shing
          <span className="ml-1 text-slate-400">(ixtiyoriy)</span>
        </p>
      </div>

      <div className="space-y-5">
        {/* Mobile-first: Big Camera + File buttons at top */}
        <div className="grid grid-cols-2 gap-3">
          {/* Camera button — for phones on the street! */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <Camera className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Kamera</p>
              <p className="text-[11px] text-slate-400">Rasm olish</p>
            </div>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={e => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {/* File picker button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <Upload className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Fayl</p>
              <p className="text-[11px] text-slate-400">PDF, DOCX, XLSX</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={e => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Desktop drag & drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`hidden cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:block ${
            dragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
          }`}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            Fayllarni bu yerga tashlang yoki <span className="font-semibold text-blue-600">tanlang</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">PDF, DOCX, XLSX va rasmlar (max 10MB)</p>
        </div>

        {/* Uploaded files list */}
        {data.files.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-700">
                {data.files.length} ta fayl yuklandi
              </span>
              <button
                type="button"
                onClick={() => onUpdate({ files: [] })}
                className="text-xs font-medium text-slate-400 hover:text-red-500"
              >
                Hammasini o'chirish
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {data.files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-3">
                  {/* File type badge */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {getFileExt(file.name)} · {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional notes */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] font-bold uppercase tracking-wide text-slate-600">
              Qo'shimcha izoh
              <span className="ml-1 text-[11px] font-normal normal-case text-slate-400">(ixtiyoriy)</span>
            </label>
            <span className="text-xs text-slate-400">{data.additionalNotes.length}/500</span>
          </div>
          <textarea
            value={data.additionalNotes}
            onChange={e => onUpdate({ additionalNotes: e.target.value.slice(0, 500) })}
            placeholder="Topshiriq bo'yicha qo'shimcha ko'rsatmalar..."
            rows={3}
            className="w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-[15px] text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-10 flex justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>
        <button
          type="submit"
          className="flex-1 sm:flex-none sm:min-w-[160px] rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700"
        >
          Keyingisi
        </button>
      </div>
    </form>
  )
}
