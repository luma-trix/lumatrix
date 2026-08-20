export function LumaMark({className=''}:{className?:string}){
  return <span className={`luma-mark ${className}`} aria-label="Luma">
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
      <defs><linearGradient id="luma-g" x1="8" y1="7" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#ff8a4c"/><stop offset=".48" stopColor="#f1c453"/><stop offset="1" stopColor="#36a69a"/></linearGradient></defs>
      <path d="M32 7 47 16v17L32 42 17 33V16L32 7Z" fill="none" stroke="url(#luma-g)" strokeWidth="5" strokeLinejoin="round"/>
      <path d="m32 20 10 6-10 6-10-6 10-6Z" fill="url(#luma-g)"/>
      <path d="M17 33 9 48h18l5-6 5 6h18l-8-15" fill="none" stroke="url(#luma-g)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="48" r="4" fill="#ff8a4c"/><circle cx="55" cy="48" r="4" fill="#36a69a"/>
    </svg>
  </span>
}
