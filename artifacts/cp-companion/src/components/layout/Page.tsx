import { ReactNode } from 'react';

interface PageProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function Page({ eyebrow, title, description, children, action }: PageProps) {
  return (
    <div className="page-in mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-10">
      <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-accent">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-[-.04em] md:text-[40px]">{title}</h1>
          {description && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
