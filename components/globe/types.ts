export interface GlobeProps {
  width: number;
  height: number;
  auroraData?: AuroraCell[];
  userLocation?: { lat: number; lng: number };
  onLocationSelect?: (lat: number, lng: number) => void;
}

export interface AuroraCell {
  lat: number;
  lng: number;
  probability: number; // 0-100
}

export interface GlobeControls {
  autoRotate: boolean;
  enableZoom: boolean;
  enablePan: boolean;
}
