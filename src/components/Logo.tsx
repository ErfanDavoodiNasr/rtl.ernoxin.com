type LogoProps = {
    size?: number
    className?: string
}

export default function Logo({size = 48, className = ''}: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`logo-svg ${className}`}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="logo-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0ea5e9"/>
                    <stop offset="0.5" stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#a855f7"/>
                </linearGradient>
                <linearGradient id="logo-shine" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.35"/>
                    <stop offset="1" stopColor="white" stopOpacity="0"/>
                </linearGradient>
                <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#logo-bg)"/>
            <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#logo-shine)"/>

            <g filter="url(#logo-glow)" stroke="white" strokeLinecap="round">
                <path
                    d="M34 16 C28 16 24 18 20 20 C16 22 14 24 12 26"
                    strokeWidth="2.5"
                    opacity="0.95"
                />
                <path
                    d="M32 24 C27 24 23 25.5 19 27 C15.5 28.5 13.5 30 11 32"
                    strokeWidth="2.5"
                    opacity="0.75"
                />
                <path
                    d="M30 32 C26.5 32 23.5 33 20 34 C17 35 14.5 36 12 37"
                    strokeWidth="2.5"
                    opacity="0.55"
                />
            </g>

            <path
                d="M10 20 L6 24 L10 28"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
            />

            <circle cx="36" cy="12" r="2.5" fill="white" opacity="0.85"/>
        </svg>
    )
}
