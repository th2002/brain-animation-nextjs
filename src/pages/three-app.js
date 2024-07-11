import { useEffect, useRef } from "react";
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  BoxGeometry,
  ShaderMaterial,
  Color,
  Vector2,
  Vector3,
  Raycaster,
  Object3D,
  MathUtils,
  LoadingManager,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { InstancedUniformsMesh } from "three-instanced-uniforms-mesh";
import { gsap } from "gsap";

// Import shaders
import vertexShader from "../shaders/brain.vertex.glsl";
import fragmentShader from "../shaders/brain.fragment.glsl";

const ThreeApp = ({ width, height }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const brainRef = useRef(null); // Ref to hold brain object
  const instancedMeshRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new Vector2());
  const intersectsRef = useRef([]);
  const hoverRef = useRef(false);
  const uniformsRef = useRef({ uHover: 0 });

  const colors = [
    new Color(0x963cbd),
    new Color(0xff6f61),
    new Color(0xc5299b),
    new Color(0xfeae51),
  ];

  const loadingManagerRef = useRef(null);
  const gltfLoaderRef = useRef(null);
  const isMobileRef = useRef(false);

  const _resizeCb = () => _onResize();
  const _mousemoveCb = (e) => _onMousemove(e);

  useEffect(() => {
    if (containerRef.current) {
      _createScene();
      _createCamera();
      _createRenderer();
      _createRaycaster();
      _createLoader();
      _checkMobile();
      _loadModel().then(() => {
        _addListeners();
        rendererRef.current.setAnimationLoop(() => {
          _update();
          _render();
        });
      });

      return () => {
        rendererRef.current.dispose();
        _removeListeners();
      };
    }
  }, []);

  const _update = () => {
    cameraRef.current.lookAt(0, 0, 0);
    cameraRef.current.position.z = isMobileRef.current ? 2.3 : 1.2;
  };

  const _render = () => {
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  const _createScene = () => {
    sceneRef.current = new Scene();
  };

  const _createCamera = () => {
    cameraRef.current = new PerspectiveCamera(75, width / height, 0.1, 100);
    cameraRef.current.position.set(0, 0, 1.2);
  };

  const _createRenderer = () => {
    rendererRef.current = new WebGLRenderer({
      alpha: true,
      antialias: window.devicePixelRatio === 1,
    });
    containerRef.current.appendChild(rendererRef.current.domElement);
    rendererRef.current.setSize(width, height);
    rendererRef.current.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    rendererRef.current.physicallyCorrectLights = true;
  };

  const _createLoader = () => {
    loadingManagerRef.current = new LoadingManager();
    loadingManagerRef.current.onLoad = () =>
      document.documentElement.classList.add("model-loaded");
    gltfLoaderRef.current = new GLTFLoader(loadingManagerRef.current);
  };

  const _loadModel = () => {
    return new Promise((resolve) => {
      gltfLoaderRef.current.load("../../static/brain.glb", (gltf) => {
        brainRef.current = gltf.scene.children[0];
        const geometry = new BoxGeometry(0.004, 0.004, 0.004, 1, 1, 1);
        const material = new ShaderMaterial({
          vertexShader,
          fragmentShader,
          wireframe: true,
          uniforms: {
            uPointer: { value: new Vector3() },
            uColor: { value: new Color() },
            uRotation: { value: 0 },
            uSize: { value: 0 },
            uHover: { value: uniformsRef.current.uHover },
          },
        });

        instancedMeshRef.current = new InstancedUniformsMesh(
          geometry,
          material,
          brainRef.current.geometry.attributes.position.count
        );
        sceneRef.current.add(instancedMeshRef.current);

        const dummy = new Object3D();
        const positions = brainRef.current.geometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
          dummy.position.set(positions[i], positions[i + 1], positions[i + 2]);
          dummy.updateMatrix();
          instancedMeshRef.current.setMatrixAt(i / 3, dummy.matrix);
          instancedMeshRef.current.setUniformAt(
            "uRotation",
            i / 3,
            MathUtils.randFloat(-1, 1)
          );
          instancedMeshRef.current.setUniformAt(
            "uSize",
            i / 3,
            MathUtils.randFloat(0.3, 3)
          );
          const colorIndex = MathUtils.randInt(0, colors.length - 1);
          instancedMeshRef.current.setUniformAt(
            "uColor",
            i / 3,
            colors[colorIndex]
          );
        }

        resolve();
      });
    });
  };

  const _createRaycaster = () => {
    raycasterRef.current = new Raycaster();
  };

  const _addListeners = () => {
    window.addEventListener("resize", _resizeCb, { passive: true });
    window.addEventListener("mousemove", _mousemoveCb, { passive: true });
  };

  const _removeListeners = () => {
    window.removeEventListener("resize", _resizeCb, { passive: true });
    window.removeEventListener("mousemove", _mousemoveCb, { passive: true });
  };

  const _onMousemove = (e) => {
    const x = (e.clientX / containerRef.current.offsetWidth) * 2 - 1;
    const y = -(e.clientY / containerRef.current.offsetHeight) * 2 - 1;
    mouseRef.current.set(x, y);

    gsap.to(cameraRef.current.position, {
      x: () => x * 0.15,
      y: () => y * 0.1,
      duration: 0.5,
    });

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    intersectsRef.current = raycasterRef.current.intersectObject(
      brainRef.current
    ); // Ensure brainRef.current is defined

    if (intersectsRef.current.length === 0) {
      if (hoverRef.current) {
        hoverRef.current = false;
        _animateHoverUniform(0);
      }
    } else {
      if (!hoverRef.current) {
        hoverRef.current = true;
        _animateHoverUniform(1);
      }

      gsap.to(pointRef.current, {
        x: () => intersectsRef.current[0]?.point.x || 0,
        y: () => intersectsRef.current[0]?.point.y || 0,
        z: () => intersectsRef.current[0]?.point.z || 0,
        overwrite: true,
        duration: 0.3,
        onUpdate: () => {
          for (let i = 0; i < instancedMeshRef.current.count; i++) {
            instancedMeshRef.current.setUniformAt(
              "uPointer",
              i,
              pointRef.current
            );
          }
        },
      });
    }
  };

  const _animateHoverUniform = (value) => {
    gsap.to(uniformsRef.current, {
      uHover: value,
      duration: 0.25,
      onUpdate: () => {
        for (let i = 0; i < instancedMeshRef.current.count; i++) {
          instancedMeshRef.current.setUniformAt(
            "uHover",
            i,
            uniformsRef.current.uHover
          );
        }
      },
    });
  };

  const _checkMobile = () => {
    isMobileRef.current = window.innerWidth < 767;
  };

  const _onResize = () => {
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
    _checkMobile();
  };

  return <div ref={containerRef} style={{ overflow: "hidden" }} />;
};

export default ThreeApp;

