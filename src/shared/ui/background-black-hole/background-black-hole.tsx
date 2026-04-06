'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './background-black-hole.module.css';

const DUST_PARTICLE_COUNT = 1400;
const STARFIELD_COUNT = 320;

const toCssColor = (value: string, fallback: string): string => {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
};

const createGlowTexture = (
  innerColor: string,
  midColor: string,
  outerColor = 'rgba(255,255,255,0)'
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.24, midColor);
  gradient.addColorStop(1, outerColor);

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
};

const createAccretionTexture = (
  hotColor: string,
  coolColor: string,
  highlightColor: string
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const center = canvas.width / 2;
  const baseGradient = context.createRadialGradient(
    center,
    center,
    120,
    center,
    center,
    center
  );

  baseGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  baseGradient.addColorStop(0.18, 'rgba(0, 0, 0, 0)');
  baseGradient.addColorStop(0.26, 'rgba(255, 231, 179, 0.12)');
  baseGradient.addColorStop(0.36, hotColor);
  baseGradient.addColorStop(0.56, coolColor);
  baseGradient.addColorStop(0.78, 'rgba(18, 10, 31, 0.14)');
  baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = baseGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = 'lighter';

  for (let index = 0; index < 180; index += 1) {
    const radius = 170 + Math.random() * 250;
    const startAngle = Math.random() * Math.PI * 2;
    const sweep = 0.35 + Math.random() * 0.85;
    const direction = index % 2 === 0 ? 1 : -1;
    const wobble = 18 + Math.random() * 34;
    const lineWidth = 3 + Math.random() * 14;
    const strokeColor = index % 3 === 0 ? highlightColor : hotColor;

    context.beginPath();
    context.lineCap = 'round';
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeColor;
    context.globalAlpha = 0.05 + Math.random() * 0.08;

    for (let step = 0; step <= 54; step += 1) {
      const progress = step / 54;
      const angle = startAngle + sweep * progress * direction;
      const spiralRadius =
        radius + Math.sin(angle * 3.2 + index) * wobble * (1 - progress * 0.75);
      const x = center + Math.cos(angle) * spiralRadius;
      const y = center + Math.sin(angle) * spiralRadius * 0.88;

      if (step === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.stroke();
  }

  const flareGradient = context.createRadialGradient(
    center,
    center,
    220,
    center,
    center,
    470
  );
  flareGradient.addColorStop(0, 'rgba(255, 244, 208, 0.18)');
  flareGradient.addColorStop(0.22, 'rgba(255, 185, 119, 0.12)');
  flareGradient.addColorStop(0.58, 'rgba(108, 73, 194, 0.07)');
  flareGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = flareGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
};

const createStars = (color: string): THREE.Points => {
  const positions = new Float32Array(STARFIELD_COUNT * 3);
  const geometry = new THREE.BufferGeometry();

  for (let index = 0; index < STARFIELD_COUNT; index += 1) {
    const radius = 7.5 + Math.random() * 10.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi) * 0.72;
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color,
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    })
  );
};

const createDustField = (
  color: string,
  map: THREE.Texture
): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(DUST_PARTICLE_COUNT * 3);

  for (let index = 0; index < DUST_PARTICLE_COUNT; index += 1) {
    const radius = 1.55 + Math.random() * 2.65;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * (0.14 + radius * 0.03);

    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = height;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color,
      depthWrite: false,
      map,
      opacity: 0.52,
      size: 0.11,
      sizeAttenuation: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
    })
  );
};

export function BackgroundBlackHole() {
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const computedStyle = getComputedStyle(stage);
    const accent = toCssColor(computedStyle.getPropertyValue('--accent'), '#8f3dff');
    const foregroundStrong = toCssColor(
      computedStyle.getPropertyValue('--foreground-strong'),
      '#ffffff'
    );
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const width = entry.contentRect.width;
      const height = entry.contentRect.height;

      if (width === 0 || height === 0) {
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    const disposables: Array<{ dispose: () => void }> = [];
    const system = new THREE.Group();
    let frameId = 0;

    scene.fog = new THREE.FogExp2('#050509', 0.07);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setClearAlpha(0);
    renderer.domElement.className = styles.canvas;
    stage.appendChild(renderer.domElement);

    camera.position.set(0, 2.15, 7.6);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight('#6d74a3', 0.5);
    const hotLight = new THREE.PointLight('#ffbc74', 11, 14, 2);
    const rimLight = new THREE.PointLight(accent, 7.5, 16, 2);

    hotLight.position.set(-1.4, 0.5, 2.2);
    rimLight.position.set(2.4, -0.3, 3.1);

    scene.add(ambientLight, hotLight, rimLight);

    system.rotation.x = -0.92;
    system.rotation.z = 0.28;
    scene.add(system);

    const stars = createStars(foregroundStrong);
    scene.add(stars);
    disposables.push(stars.geometry, stars.material as THREE.PointsMaterial);

    const outerGlowTexture = createGlowTexture(
      'rgba(255, 248, 220, 0.92)',
      'rgba(181, 116, 255, 0.36)'
    );
    const dustGlowTexture = createGlowTexture(
      'rgba(255, 228, 198, 0.9)',
      'rgba(255, 186, 112, 0.2)'
    );
    const accretionTexture = createAccretionTexture(
      'rgba(255, 176, 101, 0.18)',
      'rgba(118, 82, 215, 0.14)',
      'rgba(255, 239, 199, 0.3)'
    );

    const outerGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: outerGlowTexture,
        opacity: 0.9,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    outerGlow.scale.set(8.6, 8.6, 1);
    scene.add(outerGlow);

    const horizonGeometry = new THREE.SphereGeometry(1.08, 72, 72);
    const horizon = new THREE.Mesh(
      horizonGeometry,
      new THREE.MeshBasicMaterial({
        color: '#010102',
      })
    );
    const distortionShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.44, 64, 64),
      new THREE.MeshBasicMaterial({
        color: '#291a3e',
        opacity: 0.12,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const photonRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.12, 28, 180),
      new THREE.MeshBasicMaterial({
        color: '#ffd39a',
        opacity: 0.68,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    photonRing.rotation.x = Math.PI / 2;

    const accretionDisk = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 3.78, 256),
      new THREE.MeshBasicMaterial({
        alphaMap: accretionTexture,
        color: '#ffcf8f',
        opacity: 0.96,
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    accretionDisk.rotation.x = Math.PI / 2;
    accretionDisk.rotation.z = 0.16;

    const innerDisk = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 2.72, 220),
      new THREE.MeshBasicMaterial({
        alphaMap: accretionTexture,
        color: accent,
        opacity: 0.44,
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    innerDisk.rotation.x = Math.PI / 2;
    innerDisk.rotation.z = -0.08;
    innerDisk.position.y = 0.03;

    const dustField = createDustField('#ffd9b0', dustGlowTexture);
    system.add(accretionDisk, innerDisk, dustField, photonRing, distortionShell, horizon);
    disposables.push(
      outerGlowTexture,
      dustGlowTexture,
      accretionTexture,
      horizonGeometry,
      horizon.material as THREE.Material,
      distortionShell.geometry,
      distortionShell.material as THREE.Material,
      photonRing.geometry,
      photonRing.material as THREE.Material,
      accretionDisk.geometry,
      accretionDisk.material as THREE.Material,
      innerDisk.geometry,
      innerDisk.material as THREE.Material,
      dustField.geometry,
      dustField.material as THREE.PointsMaterial,
      outerGlow.material as THREE.SpriteMaterial
    );

    resizeObserver.observe(stage);

    const distortionMaterial = distortionShell.material as THREE.MeshBasicMaterial;
    const photonMaterial = photonRing.material as THREE.MeshBasicMaterial;
    const outerGlowMaterial = outerGlow.material as THREE.SpriteMaterial;

    const render = (time: number) => {
      const elapsed = time * 0.001;

      if (!prefersReducedMotion) {
        accretionDisk.rotation.z = elapsed * 0.42;
        innerDisk.rotation.z = -elapsed * 0.86;
        dustField.rotation.z = elapsed * 0.16;
        photonRing.rotation.z = elapsed * 0.58;
        stars.rotation.y = elapsed * 0.01;
        outerGlowMaterial.opacity = 0.88 + Math.sin(elapsed * 1.35) * 0.06;
        photonMaterial.opacity = 0.62 + Math.sin(elapsed * 1.7) * 0.08;
        distortionMaterial.opacity = 0.1 + Math.sin(elapsed * 1.2) * 0.025;
        system.rotation.y = Math.sin(elapsed * 0.18) * 0.14;
        horizon.rotation.y = elapsed * 0.18;
        camera.position.x = Math.sin(elapsed * 0.14) * 0.28;
        camera.position.y = 2.15 + Math.cos(elapsed * 0.16) * 0.12;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      disposables.forEach((resource) => {
        resource.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div className={styles.stage} ref={stageRef} />;
}
