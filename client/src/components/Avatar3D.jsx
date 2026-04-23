import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";

function Model() {
  const group = useRef();
  const { scene, animations } = useGLTF("/avatars/model (6).glb");

  const mixer = useRef();

  useEffect(() => {
    if (!scene) return;

    // ✅ Center model properly
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);

    // ✅ Scale normalization (auto-fit)
    const size = box.getSize(new THREE.Vector3()).length();
    const scaleFactor = 2.5 / size;
    scene.scale.setScalar(scaleFactor);

    // ✅ Animation setup
    if (animations && animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(scene);

      const action = mixer.current.clipAction(animations[0]);
      action.reset().fadeIn(0.3).play();

      // Optional: slow animation
      action.timeScale = 0.8;
    } else {
      console.warn("❌ No animations found in GLB");
    }
  }, [scene, animations]);

  useFrame((_, delta) => {
    mixer.current?.update(delta);
  });

  return <primitive ref={group} object={scene} />;
}

export default function Avatar3D() {
  return (
    <div style={{ width: "100%", height: 420 }}>
      <Canvas
        camera={{ position: [0, 1.2, 4], fov: 40 }}
      >
        {/* Lighting */}
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} />

        {/* Model */}
        <Model />

        {/* Controls */}
        <OrbitControls
          autoRotate
          autoRotateSpeed={1.5}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}