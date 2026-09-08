"use client"

import { Check } from "lucide-react"

type Step = {
  number: number
  title: string
  subtitle?: string
  completed: boolean
}

type StepNavigationProps = {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
}

const STEP_META = [
  { subtitle: "Nom va tavsif" },
  { subtitle: "Mas'ul va hamkor" },
  { subtitle: "Sana va muhimlik" },
  { subtitle: "Hujjatlar" },
  { subtitle: "Ko'rib chiqish" },
]

export function StepNavigation({ steps, currentStep, onStepClick }: StepNavigationProps) {
  // Progress percentage for the mobile bar
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div>
      {/* Branding */}
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Yangi topshiriq</p>
        <h2 className="mt-1 text-lg font-bold text-slate-800">Yaratish jarayoni</h2>
      </div>

      {/* Mobile horizontal mini progress (only visible on sm and below) */}
      <div className="mb-6 lg:hidden">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>{steps[currentStep - 1]?.title}</span>
          <span>{currentStep}/{steps.length}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Vertical step list (visible on lg+, compact on mobile) */}
      <div className="relative hidden lg:block">
        <div className="space-y-1">
          {steps.map((step, index) => {
            const isActive = currentStep === step.number
            const isCompleted = step.completed
            const isClickable = isCompleted && !!onStepClick
            const isLast = index === steps.length - 1
            const meta = STEP_META[index]

            return (
              <div key={step.number} className="relative">
                {/* Vertical connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-[15px] top-[36px] h-[calc(100%-4px)] w-[2px] transition-colors duration-500 ${
                      currentStep > step.number ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}

                {/* Row */}
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(step.number)}
                  className={`group flex w-full items-start gap-4 rounded-xl px-3 py-3 text-left transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50"
                      : isClickable
                      ? "hover:bg-slate-100"
                      : ""
                  }`}
                >
                  {/* Circle */}
                  <div
                    className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "border-blue-600 bg-white ring-4 ring-blue-100"
                        : isCompleted
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <span
                        className={`text-[13px] font-bold ${
                          isActive ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        {step.number}
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 pt-0.5">
                    <p
                      className={`text-sm leading-snug transition-colors duration-200 ${
                        isActive
                          ? "font-bold text-blue-700"
                          : isCompleted
                          ? "font-semibold text-slate-700"
                          : "font-medium text-slate-400"
                      }`}
                    >
                      {step.title}
                    </p>
                    {meta && (
                      <p
                        className={`mt-0.5 text-[11px] transition-colors ${
                          isActive ? "text-blue-500" : "text-slate-400"
                        }`}
                      >
                        {meta.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Completed check badge */}
                  {isCompleted && !isActive && (
                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Check className="h-2.5 w-2.5 text-blue-600" />
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom info — desktop only */}
      <div className="mt-8 hidden rounded-xl border border-slate-100 bg-white p-4 lg:block">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Qoralama rejimi
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Ma'lumotlar brauzerda saqlanadi. Tasdiqlash bosqichida yuboring.
        </p>
      </div>
    </div>
  )
}
