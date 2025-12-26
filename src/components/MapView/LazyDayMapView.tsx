import React, { Suspense, lazy } from 'react';
import { Loader, Map } from 'lucide-react';

// Lazy load del componente mappa (Leaflet è pesante ~140KB)
const DayMapView = lazy(() => import('./DayMapView'));

// Loading fallback con stile coerente
const MapLoadingFallback: React.FC = () => (
  <div
    className="w-full h-full flex flex-col items-center justify-center gap-3"
    style={{ backgroundColor: '#0a0f1a' }}
  >
    <div className="relative">
      <Map className="w-12 h-12 text-cyan-500/30" />
      <Loader className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
    </div>
    <span className="text-cyan-400/60 text-sm">Caricamento mappa...</span>
  </div>
);

// Wrapper con Suspense
const LazyDayMapView: React.FC<React.ComponentProps<typeof DayMapView>> = (props) => (
  <Suspense fallback={<MapLoadingFallback />}>
    <DayMapView {...props} />
  </Suspense>
);

export default LazyDayMapView;
