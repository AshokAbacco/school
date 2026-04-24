import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

function Model() {
  const group = useRef();
  const { scene, animations } = useGLTF("/avatars/girl-1.glb");

function Model({ url }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const mixer = useRef();

  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // center
    scene.position.set(-center.x, -center.y, -center.z);

    // scale
    const scale = 2.0 / size.y;
    scene.scale.setScalar(scale);

    // adjust slightly
    scene.position.y += 0.1;

    // animation
    if (animations?.length > 0) {
      mixer.current = new THREE.AnimationMixer(scene);
      const action = mixer.current.clipAction(animations[0]);
      action.reset().fadeIn(0.3).play();
      action.timeScale = 0.8;
    }
  }, [scene, animations]);

  useFrame((_, delta) => {
    mixer.current?.update(delta);
  });

  return <primitive ref={group} object={scene} />;
}

export default function Avatar3D() {
  // ✅ random but stable
  const randomModel = useMemo(() => {
    return MODELS[Math.floor(Math.random() * MODELS.length)];
  }, []);

  return (
    <div style={{ width: "100%", height: 260 }}>
      <Canvas camera={{ position: [0, 1.2, 4], fov: 35 }}>
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} />

        <Model url={randomModel} />

        <OrbitControls
          target={[0, 0.9, 0]}
          enableZoom={false}
          enablePan={false}
          autoRotate={false} // ❌ stop rotation
        />
      </Canvas>
    </div>
  );
}