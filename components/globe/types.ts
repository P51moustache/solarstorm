export interface AuroraCell {
  lat: number;
  lng: number;
  probability: number;
}

export interface GlobeProps {
  width: number;
  height: number;
  auroraData?: AuroraCell[];
}
