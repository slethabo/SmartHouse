import { Icon } from '../ui/Icon';

/** Decorative architectural study, shared by account screens and the project hub. */
export function ArchitectureSketch({ className = '' }) {
  return <svg className={`architecture-sketch ${className}`} viewBox="0 0 480 340" fill="none" aria-hidden="true" focusable="false">
    <path d="M32 263 239 145l207 118-207 119Z" fill="currentColor" opacity=".035" />
    <g stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="m62 222 174-100 174 100-174 101Z" opacity=".3" />
      <path d="M92 216V119l143-82 145 83v96l-145 84Z" fill="var(--sketch-paper, #f7f7ef)" />
      <path d="m92 119 143 83 145-82M235 202v98" />
      <path d="m92 119 143-82v165M235 37l145 83" opacity=".28" />
      <path d="m109 129 108 62v79l-108-62Z" fill="currentColor" opacity=".06" />
      <path d="m255 198 48-28v87l-48 28Z" fill="currentColor" opacity=".1" />
      <path d="m321 161 40-23v47l-40 23ZM123 155l55 32v37l-55-32Z" fill="currentColor" opacity=".14" />
      <path d="m109 107 126-72 127 73M79 123 235 33l158 91" strokeWidth="3" />
      <path d="M63 108v128m-8-123 16-9m-16 137 16-10M92 260l129 74m-130-82v16m130 58v16" opacity=".35" />
      <path d="m275 66 104 60m-112-55 15-9m90 69 14-10" opacity=".35" />
      <path d="M30 288h65M62 256v65" opacity=".2" />
    </g>
    <circle cx="406" cy="251" r="16" stroke="currentColor" opacity=".2" />
    <path d="M406 236v30m-15-15h30" stroke="currentColor" opacity=".2" />
  </svg>;
}

export function AuthLayout({ children }) {
  return <div className="auth-page">
    <aside className="auth-story" aria-label="Your Smart House workspace">
      <span className="studio-eyebrow">SPACE FOR YOUR NEXT CHAPTER</span>
      <h2>Imagine it.<br />Make it <em>your own.</em></h2>
      <p>A thoughtful start to your future home. Bring your ideas, explore the spaces and see how it all comes together.</p>
      <ArchitectureSketch />
      <div className="auth-story__steps"><span><Icon name="edit" size={18} /> Your brief</span><span><Icon name="layers" size={18} /> Your concept</span><span><Icon name="coins" size={18} /> Your estimate</span></div>
    </aside>
    <div className="auth-form-panel"><div className="auth-form-heading"><Icon name="house" size={19} /><span>YOUR HOME PLANNING WORKSPACE</span></div>{children}</div>
  </div>;
}
