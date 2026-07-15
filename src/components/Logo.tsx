export function Logo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static vector mark, no benefit from next/image's raster pipeline
    <img
      src="/logo.svg"
      alt="BiteSize"
      width={size}
      height={(size * 130) / 160}
      style={{ width: size, height: (size * 130) / 160 }}
    />
  );
}

export function LogoWordmark({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <span className="text-2xl font-semibold tracking-tight text-text">
        BiteSize
      </span>
    </div>
  );
}
