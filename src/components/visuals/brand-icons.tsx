type IconProps = { className?: string };

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

export function SnowflakeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1" />
      <path d="M12 2l-2.2 2.2M12 2l2.2 2.2M12 22l-2.2-2.2M12 22l2.2-2.2M2 12l2.2-2.2M2 12l2.2 2.2M22 12l-2.2-2.2M22 12l-2.2 2.2" />
    </svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 22c4.4 0 7-2.8 7-6.6 0-3.4-2.2-5.2-3.4-7.6-.4 1.6-1.2 2.6-2.3 3.2C13.6 8.2 13 5.4 10.6 3c.2 3.1-1.3 4.7-2.9 6.6C6.1 11.5 5 13.1 5 15.4 5 19.2 7.6 22 12 22Z" />
      <path d="M12 22c-1.8 0-3-1.3-3-3 0-1.9 1.6-2.8 2.4-4.4.9 1 1.7 1.7 2.5 2.4.9.8 1.1 1.4 1.1 2 0 1.7-1.2 3-3 3Z" />
    </svg>
  );
}

export function ReplaceIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 11a8 8 0 0 0-14.6-4.2M4 13a8 8 0 0 0 14.6 4.2" />
      <path d="M4 3v5h5M20 21v-5h-5" />
    </svg>
  );
}

export function GaugeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 18a9 9 0 1 1 16 0" />
      <path d="M12 14l4.5-5" />
      <circle cx="12" cy="14" r="1.4" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function ThermometerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 14.3V5a2 2 0 1 1 4 0v9.3a3.5 3.5 0 1 1-4 0Z" />
      <path d="M12 10v6" />
      <path d="M17.5 4.5h3M19 3v3" />
    </svg>
  );
}

export function AirIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8h10.5a2.5 2.5 0 1 0-2.4-3.2" />
      <path d="M3 12h15.5a2.5 2.5 0 1 1-2.4 3.2" />
      <path d="M3 16h7.5a2 2 0 1 1-1.9 2.6" />
    </svg>
  );
}

const bySlug = {
  "ac-repair": SnowflakeIcon,
  "heating-repair": FlameIcon,
  "system-replacement": ReplaceIcon,
  maintenance: GaugeIcon,
  refrigeration: ThermometerIcon,
  "indoor-air-quality": AirIcon,
} as const;

export function ServiceIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = bySlug[slug as keyof typeof bySlug] ?? AirIcon;
  return <Icon className={className} />;
}

/** North Georgia ridgeline, echoing the twin peaks in the logo. Sized to span its container. */
export function Ridgeline({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true">
      <path
        className="ridge-back"
        d="M0 200 L120 150 L230 185 L360 95 L470 150 L560 120 L690 180 L820 70 L930 135 L1040 110 L1160 175 L1290 120 L1440 170 L1440 260 L0 260 Z"
      />
      <path
        className="ridge-front"
        d="M0 235 L170 190 L300 215 L450 140 L560 190 L700 165 L850 120 L980 185 L1110 160 L1240 205 L1340 180 L1440 215 L1440 260 L0 260 Z"
      />
      <path
        className="ridge-snow"
        d="M820 70 L790 110 L812 98 L832 118 L850 92 Z M360 95 L340 120 L356 112 L372 128 L384 108 Z"
      />
    </svg>
  );
}
