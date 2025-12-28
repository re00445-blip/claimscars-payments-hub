import { Car } from "lucide-react";

interface RaceTrackProgressProps {
  startingBalance: number;
  currentBalance: number;
}

export const RaceTrackProgress = ({ startingBalance, currentBalance }: RaceTrackProgressProps) => {
  // Calculate progress percentage (0% = just started, 100% = paid in full)
  const amountPaid = startingBalance - currentBalance;
  const progressPercent = startingBalance > 0 
    ? Math.min(100, Math.max(0, (amountPaid / startingBalance) * 100))
    : 0;

  return (
    <div className="w-full py-4">
      {/* Track container */}
      <div className="relative">
        {/* Track background */}
        <div className="h-16 bg-muted rounded-full relative overflow-hidden border-4 border-border shadow-inner">
          {/* Track lanes (dashed lines) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-0.5 border-t-2 border-dashed border-muted-foreground/30" />
          </div>
          
          {/* Progress fill */}
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/60 transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          
          {/* Start flag */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <div className="flex flex-col items-center">
              <div className="w-6 h-8 bg-gradient-to-b from-foreground to-foreground/80 rounded-sm shadow-md flex flex-col overflow-hidden">
                <div className="flex-1 flex">
                  <div className="w-1/2 bg-foreground" />
                  <div className="w-1/2 bg-background" />
                </div>
                <div className="flex-1 flex">
                  <div className="w-1/2 bg-background" />
                  <div className="w-1/2 bg-foreground" />
                </div>
              </div>
              <div className="w-0.5 h-3 bg-foreground" />
            </div>
          </div>
          
          {/* Finish flag */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <div className="flex flex-col items-center">
              <div className="w-6 h-8 rounded-sm shadow-md flex flex-col overflow-hidden border border-border">
                <div className="flex-1 flex">
                  <div className="w-1/2 bg-foreground" />
                  <div className="w-1/2 bg-background" />
                </div>
                <div className="flex-1 flex">
                  <div className="w-1/2 bg-background" />
                  <div className="w-1/2 bg-foreground" />
                </div>
                <div className="flex-1 flex">
                  <div className="w-1/2 bg-foreground" />
                  <div className="w-1/2 bg-background" />
                </div>
                <div className="flex-1 flex">
                  <div className="w-1/2 bg-background" />
                  <div className="w-1/2 bg-foreground" />
                </div>
              </div>
              <div className="w-0.5 h-3 bg-foreground" />
            </div>
          </div>
          
          {/* Car icon - positioned based on progress */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-1000 ease-out"
            style={{ 
              left: `calc(${Math.max(8, Math.min(92, progressPercent))}% - 16px)`,
            }}
          >
            <div className="relative animate-bounce" style={{ animationDuration: '2s' }}>
              <Car 
                className="h-8 w-8 text-primary drop-shadow-lg" 
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Motion lines */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 flex gap-0.5 mr-1">
                <div className="w-2 h-0.5 bg-primary/60 rounded-full" />
                <div className="w-3 h-0.5 bg-primary/40 rounded-full" />
                <div className="w-2 h-0.5 bg-primary/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between mt-3 px-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">START</p>
            <p className="text-sm font-bold text-foreground">
              ${startingBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-primary">
              {progressPercent.toFixed(0)}% Complete
            </p>
            <p className="text-xs text-muted-foreground">
              ${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} paid
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">FINISH</p>
            <p className="text-sm font-bold text-primary">PAID IN FULL</p>
          </div>
        </div>
      </div>
    </div>
  );
};
