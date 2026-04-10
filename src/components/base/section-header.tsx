interface SectionHeaderProps {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, children, className }: SectionHeaderProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-0.5 mb-3">{description}</p>}
      {children}
    </div>
  );
}
