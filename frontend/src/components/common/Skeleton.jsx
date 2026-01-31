import React from 'react';

// Skeleton base component with shimmer animation
const Skeleton = ({ className = '', variant = 'text' }) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-panel-border via-white/5 to-panel-border bg-[length:200%_100%]';
  
  const variantClasses = {
    text: 'h-4 rounded',
    title: 'h-6 rounded',
    card: 'rounded-xl',
    circle: 'rounded-full',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

// KPI Card Skeleton
export const KPICardSkeleton = () => (
  <div className="bg-panel border border-panel-border rounded-xl p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton variant="circle" className="w-8 h-8" />
      <Skeleton variant="text" className="w-20" />
    </div>
    <Skeleton variant="title" className="w-16" />
    <Skeleton variant="text" className="w-24" />
  </div>
);

// Station list skeleton
export const StationListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex items-center gap-3 p-3 bg-panel border border-panel-border rounded-lg">
        <Skeleton variant="circle" className="w-6 h-6" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-24" />
          <Skeleton variant="text" className="w-16 h-3" />
        </div>
      </div>
    ))}
  </div>
);

// Map loading skeleton
export const MapSkeleton = () => (
  <div className="w-full h-full bg-panel flex items-center justify-center">
    <div className="text-center space-y-3">
      <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
      <Skeleton variant="text" className="w-24 mx-auto" />
    </div>
  </div>
);

// Dashboard skeleton (multiple KPI cards)
export const DashboardSkeleton = () => (
  <div className="grid grid-cols-4 gap-3">
    <KPICardSkeleton />
    <KPICardSkeleton />
    <KPICardSkeleton />
    <KPICardSkeleton />
  </div>
);

// Generic content skeleton
export const ContentSkeleton = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array(lines).fill(0).map((_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        className={`${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
      />
    ))}
  </div>
);

export default Skeleton;
