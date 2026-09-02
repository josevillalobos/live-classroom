"use client";

import { useMemo, type ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  Shape,
  Vector3,
} from "three";
import { type ClassroomTextures } from "./textures";
import { type Position } from "./shared";

const CHROME = { color: "#a3a8aa", metalness: 0.85, roughness: 0.3 } as const;

function TubeLeg({ position, height, splayX, splayZ }: Readonly<{
  position: Position;
  height: number;
  splayX: number;
  splayZ: number;
}>) {
  return (
    <group position={position} rotation={[splayZ, 0, splayX]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, height, 12]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.042, 0.034, 0.03, 12]} />
        <meshStandardMaterial color="#1f2223" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function DeskWithChair({ position, rotationY, scale = 1.55, textures }: Readonly<{
  position: Position;
  rotationY: number;
  scale?: number;
  textures: ClassroomTextures;
}>) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <RoundedBox args={[2.05, 0.08, 0.92]} position={[0, 1, 0]} radius={0.04} receiveShadow smoothness={3}>
        <meshStandardMaterial map={textures.wood} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[2.07, 0.05, 0.94]} position={[0, 0.975, 0]} radius={0.02}>
        <meshStandardMaterial color="#3d3a34" roughness={0.65} />
      </RoundedBox>
      <group position={[0, 0.74, -0.03]}>
        <mesh>
          <boxGeometry args={[1.72, 0.02, 0.66]} />
          <meshStandardMaterial color="#5e6664" metalness={0.5} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.1, -0.32]}>
          <boxGeometry args={[1.72, 0.2, 0.02]} />
          <meshStandardMaterial color="#5e6664" metalness={0.5} roughness={0.45} />
        </mesh>
        {[-0.85, 0.85].map((x) => (
          <mesh key={x} position={[x, 0.1, 0]}>
            <boxGeometry args={[0.02, 0.2, 0.66]} />
            <meshStandardMaterial color="#5e6664" metalness={0.5} roughness={0.45} />
          </mesh>
        ))}
      </group>
      {[-0.88, 0.88].map((x) =>
        [-0.34, 0.34].map((z) => (
          <TubeLeg
            height={0.96}
            key={`leg-${x}-${z}`}
            position={[x, 0, z]}
            splayX={Math.sign(x) * -0.035}
            splayZ={Math.sign(z) * 0.035}
          />
        )),
      )}
      {[-0.88, 0.88].map((x) => (
        <mesh key={`side-${x}`} position={[x, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.66, 10]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
      ))}
      <mesh position={[0, 0.24, -0.33]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 1.74, 10]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>

      <group position={[0, 0, 1.2]}>
        <RoundedBox args={[0.86, 0.06, 0.8]} position={[0, 0.63, 0]} radius={0.1} receiveShadow rotation={[0.03, 0, 0]} smoothness={3}>
          <meshStandardMaterial color="#c1854e" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.84, 0.5, 0.06]} position={[0, 1.08, 0.4]} radius={0.12} rotation={[0.16, 0, 0]} smoothness={3}>
          <meshStandardMaterial color="#c1854e" roughness={0.5} />
        </RoundedBox>
        {[-0.39, 0.39].map((x) => (
          <mesh key={`wing-${x}`} position={[x, 0.8, 0.31]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.06, 0.34, 0.22]} />
            <meshStandardMaterial color="#c1854e" roughness={0.5} />
          </mesh>
        ))}
        {[-0.36, 0.36].map((x) =>
          [-0.3, 0.3].map((z) => (
            <TubeLeg
              height={0.63}
              key={`chair-leg-${x}-${z}`}
              position={[x, 0, z]}
              splayX={Math.sign(x) * -0.06}
              splayZ={Math.sign(z) * 0.06}
            />
          )),
        )}
        {[-0.36, 0.36].map((x) => (
          <mesh key={`chair-side-${x}`} position={[x, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.58, 10]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0.29]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 10]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
      </group>
    </group>
  );
}

const CART = {
  width: 2.57,
  depth: 1.9,
  topShelfY: 3.15,
  middleShelfY: 2.13,
  bottomShelfY: -0.4,
} as const;

function Caster({ position }: Readonly<{ position: Position }>) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.08, 0.24, 0.13]} />
        <meshStandardMaterial color="#1b1d1e" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.09, 18]} />
        <meshStandardMaterial color="#0e1011" roughness={0.6} />
      </mesh>
    </group>
  );
}

function CartShelf({ y }: Readonly<{ y: number }>) {
  const halfWidth = CART.width / 2;
  const halfDepth = CART.depth / 2;
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CART.width, 0.06, CART.depth]} />
        <meshStandardMaterial color="#1a1c1d" metalness={0.35} roughness={0.55} />
      </mesh>
      {[halfDepth, -halfDepth].map((z) => (
        <mesh key={z} position={[0, -0.06, z]}>
          <boxGeometry args={[CART.width, 0.14, 0.04]} />
          <meshStandardMaterial color="#151718" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {[halfWidth, -halfWidth].map((x) => (
        <mesh key={x} position={[x, -0.06, 0]}>
          <boxGeometry args={[0.04, 0.14, CART.depth]} />
          <meshStandardMaterial color="#151718" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function AvCart({ children }: Readonly<{ children: ReactNode }>) {
  const postX = CART.width / 2 - 0.05;
  const postZ = CART.depth / 2 - 0.05;
  const postBottom = -0.62;
  const postHeight = CART.topShelfY + 0.03 - postBottom;
  return (
    <group>
      {[-postX, postX].map((x) =>
        [-postZ, postZ].map((z) => (
          <mesh castShadow key={`${x}-${z}`} position={[x, postBottom + postHeight / 2, z]}>
            <boxGeometry args={[0.06, postHeight, 0.06]} />
            <meshStandardMaterial color="#161819" metalness={0.5} roughness={0.42} />
          </mesh>
        )),
      )}
      <CartShelf y={CART.topShelfY} />
      <CartShelf y={CART.middleShelfY} />
      <CartShelf y={CART.bottomShelfY} />
      {[-postX + 0.05, postX - 0.05].map((x) =>
        [-postZ + 0.1, postZ - 0.1].map((z) => (
          <Caster key={`caster-${x}-${z}`} position={[x, -0.66, z]} />
        )),
      )}
      <group position={[-0.5, CART.middleShelfY + 0.14, 0.12]}>
        <RoundedBox args={[1.15, 0.22, 0.85]} castShadow radius={0.02}>
          <meshStandardMaterial color="#b6b9ba" metalness={0.55} roughness={0.38} />
        </RoundedBox>
        <mesh position={[-0.2, 0.02, 0.43]}>
          <boxGeometry args={[0.5, 0.035, 0.01]} />
          <meshStandardMaterial color="#2a2c2d" roughness={0.6} />
        </mesh>
        <mesh position={[0.32, 0.0, 0.43]}>
          <boxGeometry args={[0.28, 0.08, 0.01]} />
          <meshStandardMaterial color="#0f2a2a" emissive="#2fd9c9" emissiveIntensity={0.9} />
        </mesh>
        {[-0.48, -0.4, -0.32].map((x) => (
          <mesh key={x} position={[x, -0.06, 0.43]}>
            <boxGeometry args={[0.05, 0.03, 0.01]} />
            <meshStandardMaterial color="#3a3d3e" roughness={0.5} />
          </mesh>
        ))}
      </group>
      {[
        { color: "#1d2a52", y: 0.08, z: 0.1 },
        { color: "#2f6b5c", y: 0.19, z: 0.14 },
      ].map((tape) => (
        <mesh castShadow key={tape.color} position={[0.62, CART.middleShelfY + tape.y, tape.z]} rotation={[0, 0.12, 0]}>
          <boxGeometry args={[0.62, 0.1, 0.38]} />
          <meshStandardMaterial color={tape.color} roughness={0.7} />
        </mesh>
      ))}
      {children}
    </group>
  );
}

function OfficeChair({ position, rotationY }: Readonly<{
  position: Position;
  rotationY: number;
}>) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={1.28}>
      {[0, 1, 2, 3, 4].map((spoke) => (
        <group key={spoke} rotation={[0, (spoke / 5) * Math.PI * 2, 0]}>
          <RoundedBox args={[0.1, 0.06, 0.52]} position={[0, 0.1, 0.27]} radius={0.025}>
            <meshStandardMaterial color="#141618" metalness={0.45} roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, 0.055, 0.5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.05, 14]} />
            <meshStandardMaterial color="#0c0e0f" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.1, 0.48]}>
            <sphereGeometry args={[0.038, 10, 8]} />
            <meshStandardMaterial color="#181b1c" roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.06, 0.075, 0.22, 14]} />
        <meshStandardMaterial color="#101213" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.042, 0.042, 0.22, 14]} />
        <meshStandardMaterial color="#8f9498" metalness={0.9} roughness={0.28} />
      </mesh>
      <RoundedBox args={[0.85, 0.15, 0.82]} position={[0, 0.58, 0.02]} radius={0.06}>
        <meshStandardMaterial color="#37464f" roughness={0.95} />
      </RoundedBox>
      <mesh position={[0, 0.84, -0.4]} rotation={[-0.28, 0, 0]}>
        <boxGeometry args={[0.09, 0.52, 0.05]} />
        <meshStandardMaterial color="#141618" metalness={0.4} roughness={0.5} />
      </mesh>
      <RoundedBox args={[0.74, 0.92, 0.13]} position={[0, 1.28, -0.5]} radius={0.06} rotation={[-0.13, 0, 0]}>
        <meshStandardMaterial color="#37464f" roughness={0.95} />
      </RoundedBox>
      {[-0.45, 0.45].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.73, 0.06]}>
            <boxGeometry args={[0.055, 0.28, 0.06]} />
            <meshStandardMaterial color="#101213" roughness={0.5} />
          </mesh>
          <RoundedBox args={[0.09, 0.055, 0.42]} position={[0, 0.89, 0.02]} radius={0.025}>
            <meshStandardMaterial color="#1b1e1f" roughness={0.7} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

function TeacherComputer({ textures }: Readonly<{ textures: ClassroomTextures }>) {
  return (
    <>
      <group position={[0.95, 1.62, 2.35]} rotation={[0, 2.2, 0]}>
        <RoundedBox args={[0.66, 0.05, 0.6]} position={[0, 0.025, 0]} radius={0.02}>
          <meshStandardMaterial color="#d3ccbc" roughness={0.55} />
        </RoundedBox>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.14, 16]} />
          <meshStandardMaterial color="#c8c1b1" roughness={0.55} />
        </mesh>
        <RoundedBox args={[1.08, 0.85, 0.44]} position={[0, 0.62, 0.02]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color="#d6cfbf" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.8, 0.65, 0.5]} position={[0, 0.64, -0.36]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color="#c6bfae" roughness={0.58} />
        </RoundedBox>
        <RoundedBox args={[0.86, 0.64, 0.03]} position={[0, 0.63, 0.25]} radius={0.05} smoothness={4}>
          <meshPhysicalMaterial
            clearcoat={0.9}
            clearcoatRoughness={0.2}
            color="#1c2a36"
            emissive="#ffffff"
            emissiveIntensity={0.5}
            emissiveMap={textures.desktopScreen}
            map={textures.desktopScreen}
            roughness={0.4}
          />
        </RoundedBox>
        <mesh position={[0.4, 0.26, 0.25]}>
          <boxGeometry args={[0.06, 0.025, 0.015]} />
          <meshStandardMaterial color="#5f8f57" emissive="#7fd06a" emissiveIntensity={1.4} />
        </mesh>
      </group>
      <group position={[2.42, 1.64, 2.32]} rotation={[0, 2.95, 0]}>
        <RoundedBox args={[0.95, 0.055, 0.34]} radius={0.02}>
          <meshStandardMaterial color="#cfc8b6" roughness={0.55} />
        </RoundedBox>
        <mesh position={[0, 0.029, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.88, 0.28]} />
          <meshStandardMaterial map={textures.keyboardKeys} roughness={0.62} />
        </mesh>
      </group>
      <mesh position={[3.08, 1.66, 2.2]} rotation={[0, 2.8, 0]} scale={[1, 0.62, 1.5]}>
        <sphereGeometry args={[0.085, 16, 12]} />
        <meshStandardMaterial color="#d6cfbf" roughness={0.5} />
      </mesh>
      <group position={[0.78, 0, 0.85]}>
        <RoundedBox args={[0.55, 1.3, 0.5]} position={[0, 0.65, 0]} radius={0.03}>
          <meshStandardMaterial color="#d3ccbc" roughness={0.55} />
        </RoundedBox>
        <mesh position={[0.09, 1.1, 0.26]}>
          <boxGeometry args={[0.27, 0.035, 0.01]} />
          <meshStandardMaterial color="#8f8a7c" roughness={0.6} />
        </mesh>
        <mesh position={[-0.15, 0.95, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.014, 12]} />
          <meshStandardMaterial color="#9b9688" roughness={0.5} />
        </mesh>
      </group>
    </>
  );
}

const TEACHER_PAPERS = [
  { rotation: 0.4, x: 3.3, z: 2.55 },
  { rotation: -0.7, x: 3.58, z: 2.82 },
  { rotation: 1.9, x: 3.1, z: 2.85 },
  { rotation: 0.12, x: 3.78, z: 2.35 },
  { rotation: -2.35, x: 3.42, z: 2.25 },
  { rotation: 0.55, x: 0.8, z: 1.35 },
  { rotation: -0.2, x: 0.72, z: 1.62 },
] as const;

export function TeacherCorner({ textures }: Readonly<{ textures: ClassroomTextures }>) {
  const mouseCord = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(3.02, 1.65, 2.05),
        new Vector3(2.6, 1.64, 2.1),
        new Vector3(2.1, 1.66, 2.2),
        new Vector3(1.55, 1.74, 2.4),
        new Vector3(1.05, 1.82, 2.5),
      ]),
    [],
  );
  const topGeometry = useMemo(() => {
    const outline = new Shape();
    outline.moveTo(0, 0.2);
    outline.lineTo(1.5, 0.2);
    outline.lineTo(1.5, 1.9);
    outline.lineTo(4.6, 1.9);
    outline.lineTo(4.6, 3.3);
    outline.lineTo(0, 3.3);
    outline.closePath();
    const geometry = new ExtrudeGeometry(outline, {
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.02,
      bevelThickness: 0.015,
      depth: 0.07,
      steps: 1,
    });
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);
  return (
    <group position={[-10.61, -1, -5.31]} scale={1.34}>
      <mesh geometry={topGeometry} position={[0, 1.605, 0]} receiveShadow>
        <meshStandardMaterial color="#b08a5e" map={textures.woodLarge} roughness={0.48} />
      </mesh>
      <group position={[3.95, 0, 2.6]}>
        <RoundedBox args={[1.15, 1.52, 1.35]} position={[0, 0.775, 0]} radius={0.03}>
          <meshStandardMaterial color="#7b8171" metalness={0.3} roughness={0.5} />
        </RoundedBox>
        {[0.42, 0.88, 1.32].map((y) => (
          <group key={y}>
            <RoundedBox args={[1, 0.38, 0.05]} position={[0, y, 0.7]} radius={0.02}>
              <meshStandardMaterial color="#858b7a" metalness={0.3} roughness={0.45} />
            </RoundedBox>
            <mesh position={[0, y + 0.1, 0.74]}>
              <boxGeometry args={[0.42, 0.045, 0.045]} />
              <meshStandardMaterial color="#3c3f3a" metalness={0.7} roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[1.56, 0.775, 2.6]}>
        <boxGeometry args={[0.07, 1.52, 1.3]} />
        <meshStandardMaterial color="#7b8171" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0.72, 0.775, 0.28]}>
        <boxGeometry args={[1.34, 1.52, 0.07]} />
        <meshStandardMaterial color="#7b8171" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[2.5, 1.15, 1.96]}>
        <boxGeometry args={[2.3, 0.6, 0.05]} />
        <meshStandardMaterial color="#71776a" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[1.42, 0.775, 3.12]}>
        <cylinderGeometry args={[0.05, 0.05, 1.52, 12]} />
        <meshStandardMaterial color="#3c3f3a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.7, 0.775, 3.22]}>
        <boxGeometry args={[1.36, 1.52, 0.07]} />
        <meshStandardMaterial color="#7b8171" metalness={0.3} roughness={0.5} />
      </mesh>

      <TeacherComputer textures={textures} />
      <mesh>
        <tubeGeometry args={[mouseCord, 24, 0.009, 6]} />
        <meshStandardMaterial color="#b9b2a2" roughness={0.6} />
      </mesh>

      {TEACHER_PAPERS.map((paper, index) => (
        <mesh
          key={index}
          position={[paper.x, 1.628 + index * 0.0045, paper.z]}
          rotation={[-Math.PI / 2, 0, paper.rotation]}
        >
          <planeGeometry args={[0.5, 0.66]} />
          <meshStandardMaterial map={index % 2 === 0 ? textures.paper : textures.paperAlt} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0.76, 1.626, 1.48]} rotation={[-Math.PI / 2, 0, 0.28]}>
        <planeGeometry args={[0.6, 0.76]} />
        <meshStandardMaterial color="#d9c184" roughness={0.85} />
      </mesh>

      {[
        { color: "#8c4a3c", rotation: 0.12, y: 1.66 },
        { color: "#3f5f7a", rotation: -0.08, y: 1.735 },
        { color: "#5c7248", rotation: 0.3, y: 1.81 },
      ].map((book) => (
        <mesh key={book.color} position={[0.62, book.y, 0.55]} rotation={[0, book.rotation, 0]}>
          <boxGeometry args={[0.55, 0.075, 0.42]} />
          <meshStandardMaterial color={book.color} roughness={0.75} />
        </mesh>
      ))}

      <group position={[4.2, 0, 2.25]}>
        <mesh position={[0, 1.74, 0]}>
          <cylinderGeometry args={[0.105, 0.095, 0.25, 18]} />
          <meshStandardMaterial color="#a5402f" roughness={0.5} />
        </mesh>
        <mesh position={[0.13, 1.74, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.062, 0.017, 8, 14, Math.PI]} />
          <meshStandardMaterial color="#a5402f" roughness={0.5} />
        </mesh>
        {[
          { color: "#d8a02c", tilt: 0.14 },
          { color: "#5c7248", tilt: -0.18 },
          { color: "#b33327", tilt: 0.05 },
        ].map((pencil, index) => (
          <mesh
            key={pencil.color}
            position={[(index - 1) * 0.045, 1.98, (index % 2) * 0.05 - 0.02]}
            rotation={[pencil.tilt, 0, (index - 1) * 0.22]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.34, 8]} />
            <meshStandardMaterial color={pencil.color} roughness={0.7} />
          </mesh>
        ))}
      </group>

      <group position={[3.95, 1.695, 2.8]}>
        <mesh scale={[1, 0.88, 1]}>
          <sphereGeometry args={[0.085, 18, 14]} />
          <meshStandardMaterial color="#b23429" roughness={0.42} />
        </mesh>
        <mesh position={[0.01, 0.085, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.008, 0.011, 0.06, 6]} />
          <meshStandardMaterial color="#5a4326" roughness={0.8} />
        </mesh>
      </group>

      <OfficeChair position={[2.7, 0, 1]} rotationY={-0.12} />
    </group>
  );
}
