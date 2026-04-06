'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './black-hole-stage.module.css';

interface BlackHoleStageProps {
  size?: 'compact' | 'hero';
}

interface PlanetTexturePalette {
  bands: string[];
  base: string;
  highlight: string;
  shadow: string;
}

interface PlanetDefinition {
  orbitRadius: number;
  radius: number;
  orbitSpeed: number;
  phase: number;
  ring?: {
    color: string;
    innerRadius: number;
    outerRadius: number;
    tiltX: number;
  };
  rotationSpeed: number;
  verticalDrift: number;
  palette: PlanetTexturePalette;
}

const STARFIELD_COUNT = 280;

const toCssColor = (value: string, fallback: string): string => {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
};

const createGlowTexture = (color: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(128, 128, 18, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(0.62, 'rgba(255,255,255,0.08)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
};

const createRingTexture = (color: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 40; index += 1) {
    const alpha = 0.018 + (index % 5) * 0.012;
    const y = (index / 40) * canvas.height;
    const height = 2 + (index % 3);

    context.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    context.fillRect(0, y, canvas.width, height);
  }

  const fade = context.createLinearGradient(0, 0, 0, canvas.height);
  fade.addColorStop(0, 'rgba(255,255,255,0)');
  fade.addColorStop(0.22, 'rgba(255,255,255,0.95)');
  fade.addColorStop(0.78, 'rgba(255,255,255,0.95)');
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = fade;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
};

const createPlanetTexture = (
  palette: PlanetTexturePalette,
  seed: number
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, palette.highlight);
  gradient.addColorStop(0.45, palette.base);
  gradient.addColorStop(1, palette.shadow);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 28; index += 1) {
    const y = (index / 28) * canvas.height;
    const height = 10 + ((index + seed) % 5) * 11;
    const wave =
      Math.sin(index * 0.95 + seed * 1.4) * 28 +
      Math.cos(index * 0.45 + seed * 0.7) * 22;
    const xOffset = canvas.width * 0.18 + wave;
    const color = palette.bands[index % palette.bands.length];

    context.fillStyle = color;
    context.globalAlpha = 0.3 + (index % 4) * 0.08;
    context.fillRect(-40, y, canvas.width + 80, height);

    context.globalAlpha = 0.2;
    context.fillRect(xOffset, y - 2, canvas.width * 0.42, height + 6);
  }

  context.globalAlpha = 1;

  for (let index = 0; index < 12; index += 1) {
    const radius = 40 + ((index + seed) % 4) * 14;
    const x = (index * 83 + seed * 37) % canvas.width;
    const y = (index * 57 + seed * 51) % canvas.height;
    const spot = context.createRadialGradient(x, y, 4, x, y, radius);

    spot.addColorStop(0, 'rgba(255,255,255,0.24)');
    spot.addColorStop(0.35, 'rgba(255,255,255,0.08)');
    spot.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = spot;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
};

const createOrbitLine = (
  radius: number,
  color: string,
  opacity: number
): THREE.LineLoop => {
  const points: THREE.Vector3[] = [];

  for (let index = 0; index < 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;

    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: true,
  });

  return new THREE.LineLoop(geometry, material);
};

const createStars = (color: string): THREE.Points => {
  const positions = new Float32Array(STARFIELD_COUNT * 3);
  const geometry = new THREE.BufferGeometry();

  for (let index = 0; index < STARFIELD_COUNT; index += 1) {
    const radius = 8 + Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi) * 0.58;
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
      opacity: 0.68,
      depthWrite: false,
    })
  );
};

export function BlackHoleStage({
  size = 'hero',
}: BlackHoleStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const computedStyle = getComputedStyle(stage);
    const accent = toCssColor(
      computedStyle.getPropertyValue('--accent'),
      '#8f3dff'
    );
    const surfaceBorder = toCssColor(
      computedStyle.getPropertyValue('--surface-border'),
      '#343434'
    );
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

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    const disposables: Array<{ dispose: () => void }> = [];
    const system = new THREE.Group();
    const planets: PlanetDefinition[] = [
      {
        orbitRadius: 2.25,
        radius: 0.32,
        orbitSpeed: 0.82,
        phase: Math.PI * 0.18,
        rotationSpeed: 0.95,
        verticalDrift: 0.08,
        palette: {
          base: '#6777b8',
          bands: ['#8093db', '#54648f', '#4f5f99'],
          highlight: '#b8cbff',
          shadow: '#293553',
        },
      },
      {
        orbitRadius: 3.1,
        radius: 0.54,
        orbitSpeed: 0.48,
        phase: Math.PI * 0.72,
        ring: {
          color: 'rgb(186, 174, 255)',
          innerRadius: 0.74,
          outerRadius: 1.08,
          tiltX: Math.PI / 2.55,
        },
        rotationSpeed: 0.64,
        verticalDrift: 0.12,
        palette: {
          base: '#8657de',
          bands: ['#ab86ff', '#7240cb', '#cfb6ff'],
          highlight: '#efe3ff',
          shadow: '#371b6d',
        },
      },
      {
        orbitRadius: 4.15,
        radius: 0.42,
        orbitSpeed: 0.33,
        phase: Math.PI * 1.1,
        rotationSpeed: 0.42,
        verticalDrift: 0.1,
        palette: {
          base: '#c4784b',
          bands: ['#edb275', '#9f5930', '#f3d2a7'],
          highlight: '#ffe6c8',
          shadow: '#4c2614',
        },
      },
    ];
    let frameId = 0;

    scene.fog = new THREE.FogExp2('#09090d', 0.05);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearAlpha(0);
    renderer.domElement.className = styles.canvas;

    stage.appendChild(renderer.domElement);

    camera.position.set(0, 2.35, 8.35);
    camera.lookAt(0, 0.1, 0);

    const ambientLight = new THREE.AmbientLight('#7f8ab8', 1.3);
    const keyLight = new THREE.PointLight('#f8d8a8', 22, 22, 2);
    const rimLight = new THREE.DirectionalLight(accent, 1.45);
    const fillLight = new THREE.DirectionalLight(foregroundStrong, 0.32);

    keyLight.position.set(-1.1, 0.5, 1.8);
    rimLight.position.set(5.6, 2.8, 4.8);
    fillLight.position.set(-4.5, -2.1, -2.5);

    scene.add(ambientLight, keyLight, rimLight, fillLight);

    system.rotation.x = -0.46;
    system.rotation.z = -0.08;
    scene.add(system);

    const stars = createStars(foregroundStrong);
    const glowTexture = createGlowTexture(accent);
    const starGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: accent,
        depthWrite: false,
        map: glowTexture,
        opacity: 0.62,
        transparent: true,
        blending: THREE.AdditiveBlending,
      })
    );

    starGlow.scale.set(6.4, 6.4, 1);
    system.add(stars, starGlow);
    disposables.push(
      stars.geometry,
      stars.material as THREE.PointsMaterial,
      glowTexture,
      starGlow.material as THREE.SpriteMaterial
    );

    const starGeometry = new THREE.SphereGeometry(0.98, 64, 64);
    const starMaterial = new THREE.MeshStandardMaterial({
      color: '#fff4de',
      emissive: '#ffe7b0',
      emissiveIntensity: 1.25,
      roughness: 0.52,
      metalness: 0.08,
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    const starAura = new THREE.Mesh(
      new THREE.SphereGeometry(1.34, 48, 48),
      new THREE.MeshBasicMaterial({
        color: '#ffefcd',
        opacity: 0.08,
        transparent: true,
      })
    );

    system.add(star, starAura);
    disposables.push(starGeometry, starMaterial, starAura.geometry, starAura.material);

    planets.forEach((planet, index) => {
      const pivot = new THREE.Object3D();
      const planetTexture = createPlanetTexture(planet.palette, index + 1);
      const planetGeometry = new THREE.SphereGeometry(planet.radius, 48, 48);
      const planetMaterial = new THREE.MeshStandardMaterial({
        map: planetTexture,
        roughness: 0.92,
        metalness: 0.02,
      });
      const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
      const orbitLine = createOrbitLine(
        planet.orbitRadius,
        surfaceBorder,
        0.3 - index * 0.05
      );

      planetMesh.position.x = planet.orbitRadius;
      planetMesh.rotation.z = 0.18 + index * 0.15;
      pivot.rotation.y = planet.phase;
      pivot.add(planetMesh);
      system.add(pivot, orbitLine);
      disposables.push(
        planetTexture,
        planetGeometry,
        planetMaterial,
        orbitLine.geometry,
        orbitLine.material as THREE.LineBasicMaterial
      );

      if (planet.ring) {
        const ringTexture = createRingTexture(planet.ring.color);
        const ringGeometry = new THREE.RingGeometry(
          planet.ring.innerRadius,
          planet.ring.outerRadius,
          128
        );
        const ringMaterial = new THREE.MeshBasicMaterial({
          alphaMap: ringTexture,
          color: '#f5eaff',
          opacity: 0.58,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);

        ringMesh.rotation.x = planet.ring.tiltX;
        planetMesh.add(ringMesh);
        disposables.push(ringTexture, ringGeometry, ringMaterial);
      }

      planetMesh.userData = {
        orbitSpeed: planet.orbitSpeed,
        phase: planet.phase,
        rotationSpeed: planet.rotationSpeed,
        verticalDrift: planet.verticalDrift,
      };
      pivot.userData = {
        mesh: planetMesh,
      };
    });

    resizeObserver.observe(stage);

    const render = (time: number) => {
      const elapsed = time * 0.001;

      if (!prefersReducedMotion) {
        system.rotation.y = elapsed * 0.06;
        star.rotation.y = elapsed * 0.18;
        star.rotation.x = Math.sin(elapsed * 0.3) * 0.08;
        (starGlow.material as THREE.SpriteMaterial).opacity =
          0.48 + Math.sin(elapsed * 1.7) * 0.08;
        stars.rotation.y = elapsed * 0.012;

        system.children.forEach((child) => {
          if (!(child instanceof THREE.Object3D) || !child.userData.mesh) {
            return;
          }

          const mesh = child.userData.mesh as THREE.Mesh;
          const orbitSpeed = mesh.userData.orbitSpeed as number;
          const phase = mesh.userData.phase as number;
          const rotationSpeed = mesh.userData.rotationSpeed as number;
          const verticalDrift = mesh.userData.verticalDrift as number;

          child.rotation.y = phase + elapsed * orbitSpeed;
          mesh.rotation.y = elapsed * rotationSpeed;
          mesh.position.y =
            Math.sin(elapsed * orbitSpeed * 1.6 + phase) * verticalDrift;
        });
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

  return (
    <div
      className={`${styles.stage} ${size === 'compact' ? styles.compact : ''}`}
      ref={stageRef}
    />
  );
}
