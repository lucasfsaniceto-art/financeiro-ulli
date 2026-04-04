'use client'

export default function TopographyPattern() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <svg
        className="absolute bottom-0 right-0 w-[800px] h-[800px] opacity-[0.025]"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Curvas topograficas organicas - remetendo ao terreno do Atacama */}
        <path d="M100 700 Q200 650 300 680 Q400 710 500 670 Q600 630 700 660" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M80 660 Q180 600 290 640 Q400 680 510 620 Q620 560 720 610" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M60 620 Q170 550 280 590 Q390 630 500 570 Q610 510 730 560" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M50 580 Q160 500 270 550 Q380 600 490 530 Q600 460 740 520" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M40 540 Q150 460 260 510 Q370 560 480 490 Q590 420 750 480" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M30 500 Q140 410 250 470 Q360 530 470 450 Q580 370 760 440" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M25 460 Q130 370 240 430 Q350 490 460 410 Q570 330 770 400" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M20 420 Q120 320 230 390 Q340 460 450 370 Q560 280 780 360" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M15 380 Q110 280 220 350 Q330 420 440 330 Q550 240 790 320" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M10 340 Q100 240 210 310 Q320 380 430 290 Q540 200 800 280" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M5 300 Q90 200 200 270 Q310 340 420 250 Q530 160 800 240" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <path d="M0 260 Q80 160 190 230 Q300 300 410 210 Q520 120 800 200" stroke="currentColor" strokeWidth="0.5" fill="none" />
      </svg>
    </div>
  )
}
