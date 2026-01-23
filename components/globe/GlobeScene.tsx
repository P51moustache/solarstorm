import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { AuroraCell } from './types';

// NASA Blue Marble Earth texture URL (public domain)
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg';
const EARTH_NIGHT_URL = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg';

interface GlobeSceneProps {
  auroraData?: AuroraCell[];
  autoRotate?: boolean;
}

export function GlobeScene({ auroraData = [], autoRotate = true }: GlobeSceneProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const auroraRef = useRef<THREE.Points>(null);

  // Load Earth textures
  const [dayTexture, nightTexture] = useTexture([EARTH_TEXTURE_URL, EARTH_NIGHT_URL]);

  // Rotate earth slowly
  useFrame((_, delta) => {
    if (autoRotate && earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }
    if (autoRotate && auroraRef.current) {
      auroraRef.current.rotation.y += delta * 0.05;
    }
  });

  // Create aurora oval geometry
  const auroraGeometry = useMemo(() => {
    if (auroraData.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    // Convert aurora cells to 3D points on sphere
    for (const cell of auroraData) {
      if (cell.probability < 10) continue; // Skip low probability

      const phi = (90 - cell.lat) * (Math.PI / 180);
      const theta = (cell.lng + 180) * (Math.PI / 180);
      const radius = 1.02; // Slightly above earth surface

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      // Color based on probability (green to red)
      const intensity = cell.probability / 100;
      colors.push(
        0.2 + intensity * 0.3, // R
        0.8 - intensity * 0.3, // G
        0.2,                    // B
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geometry;
  }, [auroraData]);

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.3} />

      {/* Sun light */}
      <directionalLight position={[5, 3, 5]} intensity={1} />

      {/* Stars background */}
      <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

      {/* Earth sphere with photorealistic texture */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={dayTexture}
          emissiveMap={nightTexture}
          emissive={new THREE.Color(0x112244)}
          emissiveIntensity={0.5}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Aurora overlay */}
      {auroraGeometry && (
        <points ref={auroraRef}>
          <bufferGeometry attach="geometry" {...auroraGeometry} />
          <pointsMaterial
            size={0.02}
            vertexColors
            transparent
            opacity={0.8}
            sizeAttenuation
          />
        </points>
      )}

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={4}
        autoRotate={false}
      />
    </>
  );
}
