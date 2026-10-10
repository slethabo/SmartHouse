import { useId } from 'react';

const THEMES = {
  Modern: { wall: '#f2eee4', trim: '#3b4948', roof: '#3b4948', door: '#916a49', accent: '#b39a7e' },
  Traditional: { wall: '#f0dfc2', trim: '#fbf5e7', roof: '#97604e', door: '#645342', accent: '#c5ad8b' },
  Minimalist: { wall: '#ded6c7', trim: '#545b52', roof: '#767a6b', door: '#696c58', accent: '#b9b19e' },
};

/** Front/side architectural elevations from the same house dimensions and openings. */
export function HouseElevation({ house, side = false }) {
  const id = useId().replace(/:/g, '');
  const theme = THEMES[house.style] || THEMES.Modern;
  const width = side ? house.length : house.width;
  const scale = Math.min(72, 730 / width);
  const left = (900 - width * scale) / 2;
  const ground = 360;
  const top = ground - 2.8 * scale;
  const pitched = house.style === 'Traditional';
  const windows = house.windows.filter((w) => side ? w.axis === 'y' && w.x > house.width - 1 : w.axis === 'x');
  return <svg className="house-elevation" role="img" aria-label={`${side ? 'Side' : 'Front'} view of your ${house.style.toLowerCase()} home, with windows positioned to match the floor plan.`} viewBox="0 0 900 470">
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#e4edf0" /><stop offset="1" stopColor="#faf7ed" /></linearGradient>
      <linearGradient id={`${id}-glass`} x2="1" y2="1"><stop stopColor="#759ba5" /><stop offset=".5" stopColor="#bed4d7" /><stop offset="1" stopColor="#638994" /></linearGradient>
      <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop stopColor={theme.wall} /><stop offset="1" stopColor={theme.accent} /></linearGradient>
      <pattern id={`${id}-roof`} width="16" height="9" patternUnits="userSpaceOnUse"><rect width="16" height="9" fill={theme.roof} /><path d="M0 9H16M8 0V9" stroke="#ffffff" strokeOpacity=".15" strokeWidth=".6" /></pattern>
    </defs>
    <rect width="900" height="470" rx="16" fill={`url(#${id}-sky)`} />
    <path d="M0 335Q140 305 280 329T600 321T900 330V470H0Z" fill="#dce5ce" />
    <ellipse cx="450" cy="380" rx={Math.min(410, width * scale / 2 + 38)} ry="20" fill="#899980" opacity=".25" />
    <g opacity=".65" fill="#b6c7a9"><circle cx="50" cy="267" r="47" /><circle cx="82" cy="251" r="40" /><circle cx="850" cy="268" r="47" /></g>
    <rect x={left} y={top} width={width * scale} height={ground - top} fill={`url(#${id}-wall)`} stroke="#817e70" strokeWidth="1" />
    <rect x={left} y={ground - .18 * scale} width={width * scale} height={.18 * scale} fill={theme.trim} opacity=".45" />
    {pitched ? side ? <rect x={left - 10} y={top - 1.05 * scale} width={width * scale + 20} height={1.05 * scale} fill={`url(#${id}-roof)`} stroke={theme.roof} /> : <><polygon points={`${left - 15},${top} ${450},${top - 1.2 * scale} ${left + width * scale + 15},${top}`} fill={`url(#${id}-roof)`} stroke={theme.roof} strokeWidth="3" /><polygon points={`${left + 12},${top - 4} 450,${top - 1.05 * scale} ${left + width * scale - 12},${top - 4}`} fill={theme.wall} /><path d={`M${left - 15} ${top}H${left + width * scale + 15}`} stroke={theme.trim} strokeWidth="6" /></> : <><rect x={left - 10} y={top - .24 * scale} width={width * scale + 20} height={.27 * scale} fill={theme.roof} /><rect x={left + .1 * scale} y={top + .03 * scale} width={width * scale - .2 * scale} height={.13 * scale} fill="#303c38" opacity=".18" /></>}
    {windows.map((w, i) => {
      const x = left + (side ? w.y : w.x) * scale;
      const y = ground - 2 * scale;
      const windowWidth = w.length * scale;
      const height = 1.15 * scale;
      return <g key={i}><rect x={x - 4} y={y - 4} width={windowWidth + 8} height={height + 8} fill={theme.trim} /><rect x={x} y={y} width={windowWidth} height={height} fill={`url(#${id}-glass)`} /><path d={`M${x + windowWidth / 2} ${y}v${height}M${x} ${y + height / 2}h${windowWidth}`} stroke={theme.trim} strokeWidth="2" /><path d={`M${x + 3} ${y + height - 8}l${windowWidth - 6} -${height - 16}`} stroke="white" strokeOpacity=".2" strokeWidth="6" /><rect x={x - 7} y={y + height + 4} width={windowWidth + 14} height="5" fill={theme.trim} /></g>;
    })}
    {!side && <>
      <rect x={left + 3.75 * scale} y={ground - 2.3 * scale} width={1.3 * scale} height={2.3 * scale} fill={theme.accent} />
      <rect x={left + 3.9 * scale} y={ground - 2.15 * scale} width={scale} height={2.15 * scale} fill={theme.door} stroke={theme.trim} strokeWidth="3" />
      {[.2,.4,.6,.8].map((n) => <path key={n} d={`M${left + (3.9 + n) * scale} ${ground - 2.15 * scale}V${ground}`} stroke="#ffffff" strokeOpacity=".12" />)}
      <rect x={left + 4.73 * scale} y={ground - 1.2 * scale} width="3" height="19" rx="1" fill="#e4ded1" />
      <rect x={left + 3.5 * scale} y={ground - 2.4 * scale} width={1.8 * scale} height="7" fill={theme.trim} />
      <polygon points={`${left + 3.7 * scale},${ground} ${left + 5.1 * scale},${ground} ${left + 5.45 * scale},450 ${left + 3.35 * scale},450`} fill="#cbc5b4" />
      <g fill="#7d9273"><ellipse cx={left + 3.3 * scale} cy={ground - 12} rx="17" ry="21" /><ellipse cx={left + 5.5 * scale} cy={ground - 12} rx="17" ry="21" /></g>
    </>}
    <g fill="#8ca37d">{[left + 20, left + width * scale - 25].map((x) => <g key={x}><ellipse cx={x} cy={ground + 4} rx="35" ry="12" /><ellipse cx={x + 24} cy={ground + 4} rx="22" ry="10" /></g>)}</g>
    <text x="35" y="435" fontFamily="Arial,sans-serif" fontSize="12" fill="#53634d">{side ? 'SIDE ELEVATION' : 'FRONT / ARRIVAL VIEW'} / {house.style.toUpperCase()}</text>
    <text x="865" y="435" textAnchor="end" fontFamily="Arial,sans-serif" fontSize="12" fill="#53634d">{width.toFixed(1)} m frontage</text>
  </svg>;
}
