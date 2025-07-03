import { Skeleton } from '@/components/ui/skeleton';

type NarratorProps = {
  narration: string;
  isLoading: boolean;
};

export function Narrator({ narration, isLoading }: NarratorProps) {
  if (isLoading && !narration) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-3 p-4">
        <Skeleton className="h-5 w-full bg-primary/20" />
        <Skeleton className="h-5 w-5/6 bg-primary/20" />
        <Skeleton className="h-5 w-3/4 bg-primary/20" />
      </div>
    );
  }

  return (
    <div key={narration} className="fade-in text-center text-foreground/90 text-xl lg:text-2xl leading-relaxed font-body italic">
      <p>"{narration}"</p>
    </div>
  );
}
