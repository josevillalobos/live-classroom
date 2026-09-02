"use client";

import {
  Suspense,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  Sparkles,
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  N8AO,
  Vignette,
} from "@react-three/postprocessing";
import { ACESFilmicToneMapping, Vector3 } from "three";
import { useClassroomTextures } from "./set/textures";
import { AvCart, DeskWithChair, TeacherCorner } from "./set/furniture";
import { ClassroomTelevision } from "./set/television";
import { Bookshelf, Chalkboard, ClassroomDoor, Poster, SetDressing, WallClock } from "./set/dressing";
import { type Position } from "./set/shared";

type ClassroomSetProps = Readonly<{
  active: boolean;
  children: ReactNode;
}>;

function stageOffset(viewportWidth: number): number {
  if (viewportWidth < 700) return 0;
  if (viewportWidth < 1100) return -2.15;
  return -1.35;
}

function CameraMove({ active }: Readonly<{ active: boolean }>) {
  const { camera, size } = useThree();
  const currentLookAt = useRef(new Vector3(0, 3, -2));
  const targetPosition = useMemo(() => new Vector3(), []);
  const targetLookAt = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const narrow = size.width < 700;
    const stageX = stageOffset(size.width);
    if (active) {
      const pan = narrow ? 0 : 0.55;
      // On phones the program guide covers the lower half, so frame the TV into the top of the view.
      targetPosition.set(stageX + pan, narrow ? 3.4 : 4.2, narrow ? 3.4 : 1.65);
      targetLookAt.set(stageX + pan, narrow ? 2.85 : 4.17, -1.15);
    } else {
      targetPosition.set(stageX, narrow ? 4.2 : 4.6, narrow ? 13.8 : 14.6);
      targetLookAt.set(stageX, 2.85, -2.4);
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amount = reducedMotion ? 1 : 1 - Math.exp(-delta * (active ? 1.8 : 2.8));
    camera.position.lerp(targetPosition, amount);
    currentLookAt.current.lerp(targetLookAt, amount);
    camera.lookAt(currentLookAt.current);
  });
  return null;
}

function FluorescentLight({ position }: Readonly<{ position: Position }>) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[3.8, 0.16, 0.85]} />
        <meshStandardMaterial color="#d3cfbe" metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[3.3, 0.05, 0.56]} />
        <meshStandardMaterial color="#fff6d8" emissive="#fff1c2" emissiveIntensity={3.4} />
      </mesh>
      <pointLight color="#ffeec5" decay={1.8} distance={11} intensity={10} position={[0, -0.5, 0]} />
    </group>
  );
}

function Classroom({ active, children }: ClassroomSetProps) {
  const { size } = useThree();
  const stageX = stageOffset(size.width);
  const narrow = size.width < 700;
  const textures = useClassroomTextures();
  return (
    <>
      <CameraMove active={active} />
      <color attach="background" args={["#7e827b"]} />
      <fog attach="fog" args={["#8b8e86", 18, 34]} />

      <hemisphereLight args={["#e4e8df", "#4b4e49", 0.65]} />
      <directionalLight
        castShadow
        color="#ffedd0"
        intensity={1.5}
        position={[9, 13, 8]}
        shadow-bias={-0.0004}
        shadow-camera-bottom={-9}
        shadow-camera-far={45}
        shadow-camera-left={-16}
        shadow-camera-near={1}
        shadow-camera-right={16}
        shadow-camera-top={13}
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
        shadow-normalBias={0.02}
      />

      <Environment frames={1} resolution={256}>
        <color args={["#23251f"]} attach="background" />
        <Lightformer color="#fff4d6" intensity={5} position={[-4, 8, 1]} rotation-x={Math.PI / 2} scale={[4, 1.2, 1]} />
        <Lightformer color="#fff4d6" intensity={5} position={[4, 8, 5]} rotation-x={Math.PI / 2} scale={[4, 1.2, 1]} />
        <Lightformer color="#b8c4c9" intensity={1.2} position={[0, 3, 12]} rotation-y={Math.PI} scale={[10, 5, 1]} />
      </Environment>

      <mesh position={[0, 3.7, -5.5]} receiveShadow>
        <boxGeometry args={[22, 10, 0.34]} />
        <meshStandardMaterial map={textures.wallBack} roughness={0.92} />
      </mesh>
      <mesh position={[-10.8, 3.7, 2]} receiveShadow>
        <boxGeometry args={[0.34, 10, 15]} />
        <meshStandardMaterial map={textures.wallSide} roughness={0.92} />
      </mesh>
      <mesh position={[10.8, 3.7, 2]} receiveShadow>
        <boxGeometry args={[0.34, 10, 15]} />
        <meshStandardMaterial map={textures.wallSide} roughness={0.92} />
      </mesh>
      <mesh position={[0, 8.55, 1]} receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial map={textures.ceiling} roughness={0.95} />
      </mesh>
      <mesh position={[0, -1, 1]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 18]} />
        <MeshReflectorMaterial
          blur={[360, 120]}
          depthScale={1.1}
          map={textures.floorMap}
          maxDepthThreshold={1.4}
          minDepthThreshold={0.4}
          mirror={0}
          mixBlur={7}
          mixStrength={narrow ? 0.9 : 1.6}
          resolution={narrow ? 256 : 640}
          roughness={1}
          roughnessMap={textures.floorRoughness}
        />
      </mesh>
      {[
        { length: 22, position: [0, -0.8, -5.29] as const, rotationY: 0 },
        { length: 15, position: [-10.59, -0.8, 2] as const, rotationY: Math.PI / 2 },
        { length: 15, position: [10.59, -0.8, 2] as const, rotationY: Math.PI / 2 },
      ].map((board) => (
        <mesh key={board.position.join()} position={[...board.position]} rotation={[0, board.rotationY, 0]}>
          <boxGeometry args={[board.length, 0.4, 0.06]} />
          <meshStandardMaterial color="#3c4640" roughness={0.5} />
        </mesh>
      ))}

      <Chalkboard textures={textures} />
      <WallClock position={[8.7, 5.9, -5.1]} textures={textures} />
      <ClassroomDoor position={[-10.6, 0, 6.2]} rotationY={0} />
      <ClassroomDoor position={[10.6, 0, -3.2]} rotationY={Math.PI} />
      <TeacherCorner textures={textures} />
      <Suspense fallback={null}>
        <Poster position={[-10.58, 4.4, -1.2]} rotationZ={0.03} url="/posters/read.png" />
        <Poster position={[-10.58, 4.15, 1.6]} rotationZ={-0.02} url="/posters/hang-in-there.png" />
        <Poster position={[7.3, 3.75, -5.28]} rotationY={0} rotationZ={0.02} url="/posters/solar-system.png" />
      </Suspense>
      <SetDressing />
      <Bookshelf textures={textures} />

      <FluorescentLight position={[-4.4, 8.25, 1]} />
      <FluorescentLight position={[3.8, 8.25, 1]} />
      <FluorescentLight position={[-4.4, 8.25, 6]} />
      <FluorescentLight position={[3.8, 8.25, 6]} />

      <group position={[stageX, 0, -2.25]}>
        <AvCart>
          <ClassroomTelevision>{children}</ClassroomTelevision>
        </AvCart>
      </group>

      <DeskWithChair position={[-6.6, -1, 3.7]} rotationY={0.1} textures={textures} />
      <DeskWithChair position={[-3.6, -1, 7.5]} rotationY={-0.05} textures={textures} />
      <DeskWithChair position={[4.2, -1, 3.9]} rotationY={-0.12} textures={textures} />
      <DeskWithChair position={[7, -1, 7.2]} rotationY={0.08} textures={textures} />
      <DeskWithChair position={[0.4, -1, 7]} rotationY={0.05} scale={1.35} textures={textures} />
      <DeskWithChair position={[0.5, -1, 4.1]} rotationY={-0.03} scale={1.45} textures={textures} />

      <Sparkles color="#ffedc9" count={40} opacity={0.13} position={[0, 3, 2]} scale={[10, 7, 9]} size={1.5} speed={0.08} />
      <ContactShadows far={16} opacity={0.32} position={[0, -0.98, 1]} scale={24} />

      <EffectComposer>
        <N8AO aoRadius={0.9} distanceFalloff={0.6} halfRes intensity={3.6} quality="medium" />
        <Bloom intensity={0.45} luminanceThreshold={1} mipmapBlur />
        <Vignette darkness={0.55} eskil={false} offset={0.24} />
      </EffectComposer>
    </>
  );
}

export function ClassroomSet({ active, children }: ClassroomSetProps) {
  return (
    <div className="classroom-set">
      <Canvas
        camera={{ fov: 46, near: 0.1, far: 50, position: [0, 4.6, 14.6] }}
        dpr={[1, 1.5]}
        fallback={<div className="classroom-set-fallback" />}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
        shadows
      >
        <Classroom active={active}>{children}</Classroom>
      </Canvas>
    </div>
  );
}
