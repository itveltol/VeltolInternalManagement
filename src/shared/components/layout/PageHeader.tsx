interface Props {
  eyebrowSegments: string[];
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrowSegments, title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">
          {eyebrowSegments.map((segment, i) => (
            <span key={i}>
              {i > 0 && <span className="text-veltol-faint"> · </span>}
              <span className={i === eyebrowSegments.length - 1 ? "text-veltol-fgMute" : undefined}>
                {segment}
              </span>
            </span>
          ))}
        </div>
        <h1 className="mt-1.5 font-display text-[34px] leading-tight tracking-[-0.02em] text-veltol-fg">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[16px] text-veltol-fgDim">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
