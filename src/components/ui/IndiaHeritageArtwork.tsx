import React from 'react'

interface IndiaHeritageArtworkProps {
  className?: string
  opacity?: number
}

/**
 * Subtle India Architectural Line-Art Watermark
 * Features: India Gate, Taj Mahal, Qutub Minar, skyline elements, and subtle geometric accents.
 * Strictly decorative, non-interactive, lightweight SVG.
 */
export const IndiaHeritageArtwork: React.FC<IndiaHeritageArtworkProps> = ({
  className = '',
  opacity = 0.08,
}) => {
  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 260"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground Horizon */}
        <line x1="0" y1="250" x2="1440" y2="250" strokeWidth="1.5" />

        {/* ── Landmark 1 (Far Left): Qutub Minar Silhouette ── */}
        <polygon points="120,250 130,185 168,185 178,250" fill="currentColor" fillOpacity="0.04" />
        <line x1="125" y1="185" x2="173" y2="185" strokeWidth="2" />
        <line x1="125" y1="188" x2="173" y2="188" strokeDasharray="2 2" />
        <polygon points="132,185 138,130 160,130 166,185" fill="currentColor" fillOpacity="0.06" />
        <line x1="136" y1="130" x2="162" y2="130" strokeWidth="2" />
        <polygon points="140,130 144,85 154,85 158,130" fill="currentColor" fillOpacity="0.08" />
        <line x1="143" y1="85" x2="155" y2="85" strokeWidth="1.5" />
        <polygon points="145,85 147,48 151,48 153,85" fill="currentColor" fillOpacity="0.1" />
        <path d="M 146 48 Q 149 36 152 48 Z" fill="currentColor" />
        <line x1="149" y1="36" x2="149" y2="24" strokeWidth="1.5" />
        <circle cx="149" cy="23" r="2.5" fill="currentColor" />
        {/* Fluting details */}
        <line x1="140" y1="250" x2="146" y2="185" strokeDasharray="3 3" />
        <line x1="158" y1="250" x2="152" y2="185" strokeDasharray="3 3" />

        {/* ── Skyline Accent Left: Modern Cloud / IT Towers ── */}
        <rect x="250" y="160" width="30" height="90" fill="currentColor" fillOpacity="0.03" />
        <rect x="290" y="130" width="40" height="120" fill="currentColor" fillOpacity="0.04" />
        <line x1="310" y1="130" x2="310" y2="105" />
        <rect x="340" y="175" width="28" height="75" fill="currentColor" fillOpacity="0.03" />

        {/* ── Landmark 2 (Center-Left): Taj Mahal Silhouette ── */}
        {/* Plinth */}
        <rect x="460" y="235" width="220" height="15" rx="1" fill="currentColor" fillOpacity="0.05" />
        {/* Left Minaret */}
        <line x1="475" y1="235" x2="477" y2="90" strokeWidth="1.5" />
        <line x1="485" y1="235" x2="483" y2="90" strokeWidth="1.5" />
        <rect x="474" y="160" width="12" height="4" rx="1" />
        <rect x="475" y="115" width="10" height="4" rx="1" />
        <path d="M 476 90 Q 480 75 484 90 Z" fill="currentColor" fillOpacity="0.1" />
        <line x1="480" y1="75" x2="480" y2="68" />
        {/* Right Minaret */}
        <line x1="655" y1="235" x2="657" y2="90" strokeWidth="1.5" />
        <line x1="665" y1="235" x2="663" y2="90" strokeWidth="1.5" />
        <rect x="654" y="160" width="12" height="4" rx="1" />
        <rect x="655" y="115" width="10" height="4" rx="1" />
        <path d="M 656 90 Q 660 75 664 90 Z" fill="currentColor" fillOpacity="0.1" />
        <line x1="660" y1="75" x2="660" y2="68" />
        {/* Main Mausoleum Block */}
        <rect x="500" y="145" width="140" height="90" rx="2" fill="currentColor" fillOpacity="0.06" />
        {/* Central Iwan (Grand Portal Arch) */}
        <path d="M 545 235 L 545 175 Q 570 148 595 175 L 595 235" fill="currentColor" fillOpacity="0.05" />
        <rect x="535" y="160" width="70" height="75" fill="none" strokeWidth="1" />
        {/* Side Arches */}
        <path d="M 512 215 L 512 195 Q 522 182 532 195 L 532 215 Z" fill="currentColor" fillOpacity="0.04" />
        <path d="M 512 175 L 512 160 Q 522 150 532 160 L 532 175 Z" fill="currentColor" fillOpacity="0.04" />
        <path d="M 608 215 L 608 195 Q 618 182 628 195 L 628 215 Z" fill="currentColor" fillOpacity="0.04" />
        <path d="M 608 175 L 608 160 Q 618 150 628 160 L 628 175 Z" fill="currentColor" fillOpacity="0.04" />
        {/* Side Kiosks (Chattris) */}
        <path d="M 518 145 Q 525 128 532 145 Z" fill="currentColor" fillOpacity="0.08" />
        <line x1="525" y1="128" x2="525" y2="122" />
        <path d="M 608 145 Q 615 128 622 145 Z" fill="currentColor" fillOpacity="0.08" />
        <line x1="615" y1="128" x2="615" y2="122" />
        {/* Grand Central Bulbous Dome */}
        <path
          d="M 540 145 C 535 110 550 82 570 78 C 590 82 605 110 600 145 Z"
          fill="currentColor"
          fillOpacity="0.09"
          strokeWidth="1.5"
        />
        {/* Finial / Kalash spire */}
        <line x1="570" y1="78" x2="570" y2="58" strokeWidth="1.5" />
        <path d="M 567 68 Q 570 62 573 68 Z" fill="currentColor" />
        <circle cx="570" cy="56" r="2" fill="currentColor" />

        {/* ── Landmark 3 (Center-Right): Grand India Gate Monument ── */}
        <rect x="800" y="85" width="180" height="165" rx="3" fill="none" />
        {/* Top Attic & Cornice */}
        <rect x="790" y="70" width="200" height="17" rx="2" fill="currentColor" fillOpacity="0.06" />
        <rect x="810" y="56" width="160" height="15" rx="1" />
        <rect x="830" y="44" width="120" height="13" rx="1" fill="currentColor" fillOpacity="0.09" />
        {/* Main Archway */}
        <path
          d="M 850 250 L 850 155 Q 890 115 930 155 L 930 250"
          fill="currentColor"
          fillOpacity="0.05"
        />
        {/* Pillar Details */}
        <line x1="818" y1="85" x2="818" y2="250" />
        <line x1="962" y1="85" x2="962" y2="250" />
        <line x1="800" y1="138" x2="980" y2="138" strokeDasharray="3 3" />
        {/* Lotus Motif in Central Archway */}
        <path
          d="M 890 132 C 885 120 878 123 878 132 C 878 138 890 144 890 144 C 890 144 902 138 902 132 C 902 123 895 120 890 132 Z"
          fill="currentColor"
          fillOpacity="0.15"
        />

        {/* ── Landmark 4 (Far Right): Modern Tech Park / Cloud Antenna ── */}
        <polygon points="1120,250 1135,170 1170,170 1185,250" fill="currentColor" fillOpacity="0.04" />
        <line x1="1135" y1="170" x2="1170" y2="170" strokeWidth="1.5" />
        <polygon points="1140,170 1144,110 1161,110 1165,170" fill="currentColor" fillOpacity="0.06" />
        <line x1="1152" y1="110" x2="1152" y2="70" strokeWidth="1.5" />
        <circle cx="1152" cy="68" r="3" fill="currentColor" />
        {/* Radio / Satellite arcs */}
        <path d="M 1144 60 A 10 10 0 0 1 1160 60" strokeDasharray="2 2" />
        <path d="M 1138 52 A 18 18 0 0 1 1166 52" strokeDasharray="2 3" opacity="0.6" />

        {/* Right Heritage Dome */}
        <path d="M 1280 250 L 1285 180 L 1325 180 L 1330 250" />
        <path d="M 1280 180 Q 1305 145 1330 180 Z" fill="currentColor" fillOpacity="0.08" />
        <line x1="1305" y1="145" x2="1305" y2="130" />
        <circle cx="1305" cy="128" r="2.5" fill="currentColor" />

        {/* Subtle geometric mandala/sun accents behind skyline */}
        <circle cx="890" cy="44" r="22" strokeDasharray="2 3" opacity="0.4" />
        <circle cx="890" cy="44" r="36" strokeDasharray="4 4" opacity="0.25" />
        <circle cx="570" cy="78" r="28" strokeDasharray="2 4" opacity="0.25" />

        {/* Distant gentle foliage / trees */}
        <path d="M 380 250 Q 400 225 420 250" />
        <path d="M 410 250 Q 430 230 450 250" />
        <path d="M 720 250 Q 745 220 770 250" />
        <path d="M 755 250 Q 775 235 795 250" />
        <path d="M 1030 250 Q 1050 228 1070 250" />
        <path d="M 1210 250 Q 1230 230 1250 250" />
      </svg>
    </div>
  )
}
