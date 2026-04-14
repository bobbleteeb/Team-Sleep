"use client";

import { useEffect, useState } from "react";

interface SimulatedMapProps {
  restaurantLocation: { latitude: number; longitude: number };
  customerLocation: { latitude: number; longitude: number };
  onComplete?: () => void;
}

export default function SimulatedMap({
  restaurantLocation,
  customerLocation,
  onComplete,
}: SimulatedMapProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 15000; // 15 seconds for a nice demo
    const intervalTime = 100;
    const step = intervalTime / duration;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          clearInterval(timer);
          onComplete?.();
          return 1;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Simple linear interpolation for position
  const currentLat = restaurantLocation.latitude + (customerLocation.latitude - restaurantLocation.latitude) * progress;
  const currentLng = restaurantLocation.longitude + (customerLocation.longitude - restaurantLocation.longitude) * progress;

  // For visualization, we'll map coordinates to a 0-100% box
  const minLat = Math.min(restaurantLocation.latitude, customerLocation.latitude) - 0.005;
  const maxLat = Math.max(restaurantLocation.latitude, customerLocation.latitude) + 0.005;
  const minLng = Math.min(restaurantLocation.longitude, customerLocation.longitude) - 0.005;
  const maxLng = Math.max(restaurantLocation.longitude, customerLocation.longitude) + 0.005;

  const getX = (lng: number) => {
    const width = maxLng - minLng;
    return width === 0 ? 50 : ((lng - minLng) / width) * 100;
  };
  
  const getY = (lat: number) => {
    const height = maxLat - minLat;
    return height === 0 ? 50 : (1 - (lat - minLat) / height) * 100;
  };

  return (
    <div className="relative w-full h-80 bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border-2 border-orange-100 dark:border-orange-900/20 shadow-inner">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '30px 30px' }} />
      
      {/* Route Line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line 
          x1={`${getX(restaurantLocation.longitude)}%`} 
          y1={`${getY(restaurantLocation.latitude)}%`} 
          x2={`${getX(customerLocation.longitude)}%`} 
          y2={`${getY(customerLocation.latitude)}%`}
          className="stroke-orange-200 dark:stroke-orange-800/40 stroke-[6]"
          strokeLinecap="round"
        />
        <line 
          x1={`${getX(restaurantLocation.longitude)}%`} 
          y1={`${getY(restaurantLocation.latitude)}%`} 
          x2={`${getX(currentLng)}%`} 
          y2={`${getY(currentLat)}%`}
          className="stroke-orange-500 dark:stroke-orange-400 stroke-[6]"
          strokeLinecap="round"
        />
      </svg>

      {/* Restaurant */}
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `${getX(restaurantLocation.longitude)}%`, top: `${getY(restaurantLocation.latitude)}%` }}
      >
        <div className="group relative">
           <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border-2 border-orange-200 dark:border-orange-700 animate-pulse">
            🏪
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            Restaurant
          </div>
        </div>
      </div>

      {/* Customer */}
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `${getX(customerLocation.longitude)}%`, top: `${getY(customerLocation.latitude)}%` }}
      >
        <div className="group relative">
          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border-2 border-red-200 dark:border-red-700">
            🏠
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            You
          </div>
        </div>
      </div>

      {/* Driver */}
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-100 ease-linear"
        style={{ left: `${getX(currentLng)}%`, top: `${getY(currentLat)}%` }}
      >
        <div className="relative">
          <div className="text-3xl filter drop-shadow-lg animate-bounce">
            🛵
          </div>
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </div>
        </div>
      </div>

      {/* Legend & Info */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-xl shadow-sm border border-orange-100 dark:border-orange-900/30 text-[10px] font-bold uppercase tracking-wider space-y-2">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             <span>Driver Active</span>
          </div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
             <span>{Math.round(progress * 100)}% Delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
