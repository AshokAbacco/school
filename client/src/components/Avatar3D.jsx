// client/src/components/Avatar3D.jsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useRef, useEffect, useMemo, useState, useCallback, Component } from "react";
import * as THREE from "three";

const BOY_MODELS = [
  "/avatars/boys/Boy1.glb",
  "/avatars/boys/boy2.glb",
  "/avatars/boys/boy4.glb",
  "/avatars/boys/model1.glb",
  "/avatars/boys/model2.glb",
];

const GIRL_MODELS = [
  "/avatars/girls/girl.glb",
  "/avatars/girls/girl-1.glb",
];

class CanvasErrorBoundary extends Component {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(err) {
    console.warn("Avatar3D: caught —", err?.message);
  }

  render() {
    if (this.state.crashed) {
      return this.props.fallback ?? (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(237,243,250,0.85)", borderRadius: 10,
          fontSize: 11, color: "#6A89A7", fontFamily: "'Inter', sans-serif",
        }}>
          3D preview unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

function Model({ url }) {
  const group = useRef();
  const mixer = useRef(null);
  const { scene, animations } = useGLTF(url);

useEffect(() => {
  if (!scene) return;

  scene.updateMatrixWorld(true);

  const box = new THREE.Box3();

  scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.computeBoundingBox();
      const childBox = child.geometry.boundingBox.clone();
      childBox.applyMatrix4(child.matrixWorld);
      box.union(childBox);
    }
  });

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  scene.position.sub(center);

  const targetHeight = 2.8;
  const scale = targetHeight / size.y;

  scene.scale.setScalar(scale);

  scene.position.x = 0;
  scene.position.y = -1.35;

  if (animations?.length > 0) {
    mixer.current = new THREE.AnimationMixer(scene);
    const action = mixer.current.clipAction(animations[0]);
    action.reset().fadeIn(0.3).play();
    action.timeScale = 0.8;
  }

  return () => {
    mixer.current?.stopAllAction();
    mixer.current?.uncacheRoot(scene);
    mixer.current = null;
  };
}, [scene, animations]);
 
  useFrame((_, delta) => {
    mixer.current?.update(delta);
  });
 
  return <primitive ref={group} object={scene} />;
}

function ContextWatcher({ onLost, onRestored }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (e) => { e.preventDefault(); onLost?.(); };
    const handleRestored = () => onRestored?.();
    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [gl, onLost, onRestored]);

  return null;
}

function AvatarCanvas({ modelPath, onLost, onRestored }) {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 4.5], fov: 36 }}
      gl={{
        powerPreference: "low-power",
        antialias: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      }}
      style={{
        borderRadius: 10,
        width: "100%",
        height: "100%",
        display: "block",
      }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      }}
    >
      <ContextWatcher onLost={onLost} onRestored={onRestored} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 3, 3]} intensity={1.2} />
      <Model url={modelPath} />
      <OrbitControls
        target={[0, 1.0, 0]}
        makeDefault
        enableZoom={false}
        enablePan={false}
        autoRotate={true}
        autoRotateSpeed={2.5}
      />
    </Canvas>
  );
}

export default function Avatar3D({ gender, studentId, fallback }) {
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleLost = useCallback(() => setContextLost(true), []);
  const handleRestored = useCallback(() => {
    setContextLost(false);
    setCanvasKey((k) => k + 1);
  }, []);

  const modelList =
    gender === "FEMALE" ? GIRL_MODELS
    : gender === "MALE"  ? BOY_MODELS
    : [...BOY_MODELS, ...GIRL_MODELS];

  const modelPath = useMemo(() => {
    const k = (studentId || "") + (gender || "");
    let hash = 0;
    for (let i = 0; i < k.length; i++) hash += k.charCodeAt(i);
    return modelList[hash % modelList.length];
  }, [studentId, gender, modelList]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {contextLost && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(237,243,250,0.92)", borderRadius: 10,
          fontSize: 11, color: "#6A89A7", fontFamily: "'Inter', sans-serif",
        }}>
          Restoring 3D view…
        </div>
      )}
      <CanvasErrorBoundary fallback={fallback}>
        <AvatarCanvas
          key={canvasKey}
          modelPath={modelPath}
          onLost={handleLost}
          onRestored={handleRestored}
        />
      </CanvasErrorBoundary>
    </div>
  );
}

[...BOY_MODELS, ...GIRL_MODELS].forEach((url) => useGLTF.preload(url));
