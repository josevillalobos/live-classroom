"use client";

import { useMemo } from "react";
import { RoundedBox, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import { mulberry32, type ClassroomTextures } from "./textures";
import { type Position } from "./shared";

export function Chalkboard({ textures }: Readonly<{ textures: ClassroomTextures }>) {
  return (
    <group position={[0, 4.25, -5.22]}>
      <mesh receiveShadow>
        <boxGeometry args={[10.5, 3.65, 0.16]} />
        <meshStandardMaterial map={textures.chalkboard} roughness={0.85} />
      </mesh>
      {[
        { args: [10.9, 0.14, 0.2] as const, position: [0, 1.9, 0.01] as const },
        { args: [10.9, 0.14, 0.2] as const, position: [0, -1.9, 0.01] as const },
        { args: [0.14, 3.94, 0.2] as const, position: [-5.38, 0, 0.01] as const },
        { args: [0.14, 3.94, 0.2] as const, position: [5.38, 0, 0.01] as const },
      ].map((frame) => (
        <mesh key={frame.position.join()} position={[...frame.position]}>
          <boxGeometry args={[...frame.args]} />
          <meshStandardMaterial color="#9a988c" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, -2.03, 0.16]}>
        <boxGeometry args={[9.8, 0.08, 0.34]} />
        <meshStandardMaterial color="#8f8d81" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[-1.6, -1.95, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.42, 10]} />
        <meshStandardMaterial color="#f2efe4" roughness={0.9} />
      </mesh>
      <mesh position={[2.3, -1.95, 0.16]} rotation={[0, 0.4, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.36, 10]} />
        <meshStandardMaterial color="#e8d8c8" roughness={0.9} />
      </mesh>
      <group position={[0.6, -1.9, 0.18]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.52, 0.08, 0.24]} />
          <meshStandardMaterial color="#31506d" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.52, 0.06, 0.24]} />
          <meshStandardMaterial color="#d8d4c4" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

export function WallClock({ position, textures }: Readonly<{
  position: Position;
  textures: ClassroomTextures;
}>) {
  return (
    <group position={position} scale={1.55}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.12, 40]} />
        <meshStandardMaterial color="#1e2223" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <circleGeometry args={[0.53, 40]} />
        <meshStandardMaterial map={textures.clockFace} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.11, 0.09]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.045, 0.3, 0.02]} />
        <meshStandardMaterial color="#222627" />
      </mesh>
      <mesh position={[0, 0.16, 0.1]} rotation={[0, 0, 0.52]}>
        <boxGeometry args={[0.035, 0.42, 0.02]} />
        <meshStandardMaterial color="#222627" />
      </mesh>
      <mesh position={[0, 0.1, 0.11]} rotation={[0, 0, 2.4]}>
        <boxGeometry args={[0.015, 0.46, 0.01]} />
        <meshStandardMaterial color="#c1382c" />
      </mesh>
    </group>
  );
}

export function Bookshelf({ textures }: Readonly<{ textures: ClassroomTextures }>) {
  const random = useMemo(() => mulberry32(7), []);
  const books = useMemo(
    () =>
      Array.from({ length: 15 }, (_, index) => ({
        color: ["#8c4a3c", "#3f5f7a", "#5c7248", "#a8843c", "#6d4f68", "#b06a48"][index % 6],
        height: 0.62 + random() * 0.3,
        lean: index === 8 ? -0.16 : 0,
        width: 0.12 + random() * 0.1,
      })),
    [random],
  );
  let cursor = -2.5;
  return (
    <group position={[9.9, -1, 1.9]}>
      <RoundedBox args={[1.15, 1.9, 5.9]} castShadow position={[0, 0.95, 0]} radius={0.03} receiveShadow>
        <meshStandardMaterial map={textures.wood} roughness={0.6} />
      </RoundedBox>
      <mesh position={[-0.59, 0.95, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[5.7, 1.7]} />
        <meshStandardMaterial color="#4a3c28" roughness={0.8} />
      </mesh>
      {books.map((book, index) => {
        cursor += book.width / 2 + 0.02;
        const z = cursor;
        cursor += book.width / 2;
        return (
          <mesh key={index} position={[0, 1.9 + book.height / 2, z]} rotation={[book.lean, 0, 0]}>
            <boxGeometry args={[0.5, book.height, book.width]} />
            <meshStandardMaterial color={book.color} roughness={0.75} />
          </mesh>
        );
      })}
      <group position={[0, 2.28, 2.35]}>
        <mesh>
          <sphereGeometry args={[0.34, 24, 18]} />
          <meshStandardMaterial color="#3f6f9e" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.34, 0]}>
          <cylinderGeometry args={[0.09, 0.2, 0.14, 16]} />
          <meshStandardMaterial color="#77552e" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export function ClassroomDoor({ position, rotationY }: Readonly<{
  position: Position;
  rotationY: number;
}>) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[0.2, 5.9, 3]} />
        <meshStandardMaterial color="#8c9188" roughness={0.55} />
      </mesh>
      <RoundedBox args={[0.14, 5.5, 2.6]} position={[0.08, 1.75, 0]} radius={0.02}>
        <meshStandardMaterial color="#7a5a34" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0.16, 3.4, 0.55]}>
        <boxGeometry args={[0.03, 1.5, 0.5]} />
        <meshPhysicalMaterial clearcoat={0.8} color="#20302c" metalness={0.2} roughness={0.25} />
      </mesh>
      <mesh position={[0.2, 1.6, -0.95]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 16]} />
        <meshStandardMaterial color="#b8b4a4" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Poster({ position, rotationY = Math.PI / 2, rotationZ, url }: Readonly<{
  position: Position;
  rotationY?: number;
  rotationZ: number;
  url: string;
}>) {
  const texture = useTexture(url, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
    loaded.anisotropy = 8;
    loaded.needsUpdate = true;
  });
  return (
    <mesh position={position} rotation={[0, rotationY, rotationZ]}>
      <planeGeometry args={[1.9, 2.85]} />
      <meshStandardMaterial map={texture} roughness={0.85} />
    </mesh>
  );
}

export function SetDressing() {
  return (
    <group>
      <group position={[0, 6.55, -5.15]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 6.2, 18]} />
          <meshStandardMaterial color="#cfc5ad" roughness={0.7} />
        </mesh>
        {[-3.12, 3.12].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.08, 18]} />
            <meshStandardMaterial color="#2a2c2d" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, -0.17, 0.02]}>
          <boxGeometry args={[6.1, 0.06, 0.1]} />
          <meshStandardMaterial color="#b8ae95" roughness={0.75} />
        </mesh>
        <mesh position={[2.2, -0.42, 0.05]}>
          <boxGeometry args={[0.05, 0.42, 0.02]} />
          <meshStandardMaterial color="#2a2c2d" roughness={0.6} />
        </mesh>
        <mesh position={[2.2, -0.66, 0.05]}>
          <torusGeometry args={[0.06, 0.015, 8, 16]} />
          <meshStandardMaterial color="#2a2c2d" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
      <group position={[9.6, -1, -4.4]}>
        <mesh position={[0, 2.75, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 5.5, 14]} />
          <meshStandardMaterial color="#5a3a24" roughness={0.55} />
        </mesh>
        <mesh position={[0, 5.56, 0]}>
          <sphereGeometry args={[0.1, 14, 12]} />
          <meshStandardMaterial color="#5a3a24" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.42, 0.46, 0.12, 20]} />
          <meshStandardMaterial color="#4a2f1d" roughness={0.6} />
        </mesh>
        {[5.25, 4.35].map((height, tier) =>
          [0, 1, 2, 3].map((index) => {
            const angle = (index / 4) * Math.PI * 2 + tier * (Math.PI / 4);
            return (
              <group key={`${tier}-${index}`} position={[0, height, 0]} rotation={[0, -angle, 0]}>
                <mesh position={[0.2, 0.06, 0]} rotation={[0, 0, -0.55]}>
                  <cylinderGeometry args={[0.02, 0.024, 0.42, 10]} />
                  <meshStandardMaterial color="#c9a54d" metalness={0.75} roughness={0.32} />
                </mesh>
                <mesh position={[0.37, 0.2, 0]}>
                  <sphereGeometry args={[0.045, 10, 10]} />
                  <meshStandardMaterial color="#d9b654" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>
            );
          }),
        )}
      </group>
      <group position={[-5.6, -1, -3.6]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.42, 0.36, 1, 20, 1, true]} />
          <meshStandardMaterial color="#6f7370" metalness={0.3} roughness={0.55} side={2} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.02, 20]} />
          <meshStandardMaterial color="#4f5350" roughness={0.6} />
        </mesh>
        {[
          { position: [0.12, 0.9, -0.05] as const, size: 0.12 },
          { position: [-0.14, 0.86, 0.08] as const, size: 0.1 },
          { position: [0.75, 0.09, 0.3] as const, size: 0.09 },
        ].map((paper, index) => (
          <mesh key={index} position={[...paper.position]} rotation={[index, index * 0.7, 0]}>
            <dodecahedronGeometry args={[paper.size, 0]} />
            <meshStandardMaterial color="#efe9d8" roughness={0.9} />
          </mesh>
        ))}
      </group>
      {[
        { color: "#2f3d7a", position: [-4.9, -1, 4.9] as const, rotation: 0.4 },
        { color: "#8c3b32", position: [6.1, -1, 5.3] as const, rotation: -0.5 },
      ].map((pack) => (
        <group key={pack.color} position={[...pack.position]} rotation={[0.18, pack.rotation, 0]}>
          <RoundedBox args={[0.62, 0.78, 0.36]} position={[0, 0.39, 0]} radius={0.12} smoothness={3}>
            <meshStandardMaterial color={pack.color} roughness={0.8} />
          </RoundedBox>
          <RoundedBox args={[0.48, 0.34, 0.14]} position={[0, 0.3, 0.22]} radius={0.06} smoothness={3}>
            <meshStandardMaterial color={pack.color} roughness={0.8} />
          </RoundedBox>
          <mesh position={[0, 0.8, -0.02]}>
            <torusGeometry args={[0.09, 0.02, 8, 16]} />
            <meshStandardMaterial color="#1d1f22" roughness={0.7} />
          </mesh>
        </group>
      ))}
      <group position={[10.5, 5.35, 6.8]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[0.9, 0.34, 0.12]} />
          <meshStandardMaterial color="#2a1f1f" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[0.8, 0.24]} />
          <meshStandardMaterial color="#ff3b30" emissive="#ff2a1a" emissiveIntensity={2.4} />
        </mesh>
      </group>
      <mesh position={[-10.58, 3.9, 8.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.22, 0.34]} />
        <meshStandardMaterial color="#e9e4d5" roughness={0.7} />
      </mesh>
    </group>
  );
}
