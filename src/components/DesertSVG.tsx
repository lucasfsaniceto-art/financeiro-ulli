'use client'

/** Silhueta do horizonte do Atacama — vulcoes/montanhas simplificados */
export function HorizonSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      {/* Linha do horizonte */}
      <line x1="0" y1="160" x2="800" y2="160" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
      {/* Silhueta de montanhas/vulcoes — Licancabur mais alto a esquerda */}
      <path
        d="M0 200 L0 170 Q40 168 80 165 Q120 160 160 140 Q200 115 240 90 Q260 78 280 85 Q320 100 360 130 Q380 142 400 148 Q430 155 460 145 Q490 130 510 120 Q540 108 560 115 Q590 128 620 140 Q650 150 680 155 Q720 158 760 162 Q780 164 800 165 L800 200 Z"
        fill="currentColor"
        opacity="0.06"
      />
    </svg>
  )
}

/** Sol que se posiciona de acordo com a hora do dia */
export function SunIndicator({ hour }: { hour: number }) {
  // Mapeia 6-18h para posicao horizontal (10%-90%) e vertical (arco)
  const clampedHour = Math.max(6, Math.min(18, hour))
  const progress = (clampedHour - 6) / 12 // 0 a 1
  const x = 10 + progress * 80 // 10% a 90%
  const y = 50 - Math.sin(progress * Math.PI) * 35 // arco: alto no meio dia

  return (
    <div
      className="absolute w-6 h-6 rounded-full bg-accent opacity-80"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}

/** Empty state: horizonte vazio com lua solitaria */
export function EmptyDesert({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dunas distantes */}
      <path
        d="M0 90 Q30 80 60 85 Q90 90 120 82 Q150 74 180 80 Q190 82 200 85"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.15"
        fill="none"
      />
      {/* Sol/Lua sobre o horizonte */}
      <circle cx="130" cy="55" r="16" fill="currentColor" opacity="0.08" />
      {/* Estrelas distantes */}
      <circle cx="40" cy="35" r="1.5" fill="currentColor" opacity="0.1" />
      <circle cx="90" cy="25" r="1" fill="currentColor" opacity="0.08" />
      <circle cx="170" cy="40" r="1.5" fill="currentColor" opacity="0.1" />
    </svg>
  )
}

/** Arco semicircular gauge para KPI cards */
export function GaugeArc({ percentage, direction = 'ltr' }: { percentage: number; direction?: 'ltr' | 'rtl' }) {
  const radius = 40
  const strokeWidth = 4
  const circumference = Math.PI * radius // semicirculo
  const progress = Math.min(100, Math.max(0, percentage)) / 100
  const dashOffset = circumference * (1 - progress)

  return (
    <svg viewBox="0 0 100 55" className="w-full h-auto">
      {/* Track de fundo */}
      <path
        d="M 10 50 A 40 40 0 0 1 90 50"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        opacity="0.08"
        strokeLinecap="round"
      />
      {/* Progresso */}
      <path
        d={direction === 'ltr'
          ? "M 10 50 A 40 40 0 0 1 90 50"
          : "M 90 50 A 40 40 0 0 0 10 50"
        }
        stroke="#C27B4F"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="transition-all duration-slow"
      />
    </svg>
  )
}
