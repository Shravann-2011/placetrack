// Hand-drawn style accents (our own shapes): a squiggle, a spark and a jagged edge
export const Squiggle = ({ className = '', color = 'currentColor', stretch = false }) => (
  <svg viewBox="0 0 120 40" className={className} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
    preserveAspectRatio={stretch ? 'none' : undefined} aria-hidden="true">
    <path d="M4 30 L22 8 L38 30 L56 8 L72 30 L90 8 L114 30" vectorEffect={stretch ? 'non-scaling-stroke' : undefined} strokeWidth={stretch ? 5 : undefined} />
  </svg>
);
export const Spark = ({ className = '', color = 'currentColor' }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" aria-hidden="true">
    <path d="M20 3v9M20 28v9M3 20h9M28 20h9M8 8l6 6M26 26l6 6M32 8l-6 6M14 26l-6 6" />
  </svg>
);
// A row of uneven peaks, used as the top edge of the footer
export const JaggedEdge = ({ className = '', color = 'currentColor' }) => (
  <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className={className} aria-hidden="true">
    <path fill={color} d="M0 120V70l80-40 70 55 90-75 80 60 110-50 70 45 100-60 90 70 80-35 120 50 90-65 100 55 80-30 110 40 100-55 70 40V120Z" />
  </svg>
);
