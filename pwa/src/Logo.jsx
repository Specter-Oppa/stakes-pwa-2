// <Logo size={48} /> works in the web app. For React Native use react-native-svg (same paths).
export default function Logo({ size = 64, rounded = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label="Stakes">
      <defs>
        <linearGradient id="stakes-lime" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E2FF7A" /><stop offset="1" stopColor="#C6FF3D" /></linearGradient>
        <radialGradient id="stakes-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#C6FF3D" stopOpacity=".22" /><stop offset="1" stopColor="#C6FF3D" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1024" height="1024" rx={rounded ? 230 : 0} fill="#0B0B0F" />
      <circle cx="512" cy="512" r="470" fill="url(#stakes-glow)" />
      <circle cx="512" cy="512" r="330" fill="none" stroke="#24242D" strokeWidth="56" />
      <circle cx="512" cy="512" r="330" fill="none" stroke="url(#stakes-lime)" strokeWidth="56" strokeLinecap="round" strokeDasharray="1617 2074" transform="rotate(-90 512 512)" />
      <path d="M628 400C628 350 580 322 512 322C440 322 396 354 396 404C396 460 440 480 512 500C590 522 630 548 630 608C630 664 584 700 512 700C440 700 396 668 392 618" fill="none" stroke="url(#stakes-lime)" strokeWidth="76" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="188" cy="450" r="17" fill="#0B0B0F" />
    </svg>
  );
}
