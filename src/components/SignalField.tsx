import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap, reducedMotion, ScrollTrigger } from "../lib/motion";
import type { SignalKey } from "../data";
import { Waveform } from "./Waveform";

// A field of points displaced by the same three waves as the 2D signal:
// sine (engineer), square (manager) and sawtooth (designer). Rows further back
// are phase-shifted and fainter, which turns one line into a rippling surface.
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uTune;
  uniform vec3 uMix;
  uniform float uMouseX;
  uniform float uMouseAmp;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uEnergy;
  attribute float aRow;
  varying float vRow;
  varying float vLevel;

  const float PI = 3.141592653589793;
  float squareWave(float x) { float s = sin(x); return s / sqrt(s * s + 0.03); }
  float sawWave(float x) { float t = x / (2.0 * PI); return 2.0 * (t - floor(t + 0.5)); }

  void main() {
    vec3 p = position;
    float u = p.x / 10.0 + 0.5;
    float x = u * 3.0 * 2.0 * PI;
    float phase = uTime * 0.9 + aRow * 2.4;

    float total = 0.5 * uMix.x + 0.3 * uMix.y + 0.2 * uMix.z + 0.0001;
    float v = (0.5 * uMix.x * sin(x + phase)
             + 0.3 * uMix.y * squareWave(0.5 * (x + phase))
             + 0.2 * uMix.z * sawWave(2.0 * (x + phase))) / total;

    float bump = 1.0 + uMouseAmp * exp(-pow((u - uMouseX) * 4.0, 2.0));
    p.y += v * uTune * (1.0 - aRow * 0.55) * bump * 1.1 * (1.0 + uEnergy * 0.9);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = mix(3.4, 1.6, aRow) * uSize * uPixelRatio * (6.0 / -mv.z);
    vRow = aRow;
    vLevel = abs(v);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uBlue;
  uniform float uOpacity;
  varying float vRow;
  varying float vLevel;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    vec3 color = mix(uGold, uBlue, smoothstep(0.0, 0.55, vRow)) + vLevel * 0.12;
    gl_FragColor = vec4(color, soft * mix(1.0, 0.22, vRow) * uOpacity);
  }
`;

type Props = { solo: SignalKey | null; ready: boolean };

export function SignalField({ solo, ready }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const uniforms = useRef<Record<string, THREE.IUniform> | null>(null);
  const renderNow = useRef<() => void>(() => {});
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = reducedMotion();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFallback(true);
      return;
    }
    // Phones get about a third of the points at a lower resolution; the field
    // spans the same depth, so it looks the same, just with larger dots.
    const light = window.matchMedia("(pointer: coarse)").matches || el.clientWidth < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, light ? 1.5 : 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 1.5, 6.5);
    camera.lookAt(0, -0.2, -1.6);

    const cols = light ? 150 : 260;
    const rows = light ? 22 : 34;
    const depth = 7.26;
    const positions = new Float32Array(cols * rows * 3);
    const rowAttr = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        positions[i * 3] = (c / (cols - 1) - 0.5) * 10;
        positions[i * 3 + 2] = -(r / (rows - 1)) * depth;
        rowAttr[i] = r / (rows - 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aRow", new THREE.BufferAttribute(rowAttr, 1));

    const css = getComputedStyle(document.documentElement);
    const u: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uTune: { value: reduced ? 1 : 0 },
      uMix: { value: new THREE.Vector3(1, 1, 1) },
      uMouseX: { value: 0.5 },
      uMouseAmp: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSize: { value: light ? 1.35 : 1 },
      uEnergy: { value: 0 },
      uGold: { value: new THREE.Color(css.getPropertyValue("--signal").trim()) },
      uBlue: { value: new THREE.Color(css.getPropertyValue("--trace").trim()) },
      uOpacity: { value: 1 },
    };
    uniforms.current = u;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const render = () => renderer.render(scene, camera);
    renderNow.current = render;

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const pointer = { x: 0.5, y: 0.6 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove);

    // The field sits behind the whole page and changes pose by section: full in
    // the hero, a lower, softer wave while you read, and strong again at contact.
    const hero = { y: -0.35, tilt: 0, opacity: 1 };
    const reading = { y: -0.95, tilt: 0.18, opacity: 0.6 };
    const finale = { y: -0.6, tilt: 0.05, opacity: 0.9 };
    const view = { ...hero };
    const triggers: ScrollTrigger[] = [];
    if (!reduced) {
      // Low refresh priority so these measure after the pinned gallery adds its height.
      const leave = gsap.fromTo(view, hero, {
        ...reading,
        ease: "none",
        scrollTrigger: { trigger: "#top", start: "top top", end: "bottom top", scrub: true, refreshPriority: -1 },
      });
      // Ends at the bottom of the page, so the finale always completes.
      const arrive = gsap.fromTo(view, reading, {
        ...finale,
        ease: "none",
        immediateRender: false,
        scrollTrigger: { trigger: "#contact", start: "top bottom", end: "bottom bottom", scrub: true, refreshPriority: -1 },
      });
      triggers.push(leave.scrollTrigger!, arrive.scrollTrigger!);
    }

    // Scroll speed stirs the field up, the same way it swells the scope line.
    const energy = { push: 0, value: 0 };
    triggers.push(
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => (energy.push = Math.min(Math.abs(self.getVelocity()) / 2000, 1)),
      })
    );

    let time = 0;
    const loop = (_t: number, delta: number) => {
      energy.value += (energy.push - energy.value) * 0.08;
      energy.push *= 0.92;
      time += (delta / 1000) * (1 + energy.value * 2.5);
      u.uTime.value = time;
      u.uEnergy.value = energy.value;
      u.uMouseX.value += (pointer.x - u.uMouseX.value) * 0.05;
      u.uMouseAmp.value += ((1 - pointer.y) * 0.9 - u.uMouseAmp.value) * 0.05;
      points.rotation.x = view.tilt;
      points.position.y = view.y;
      u.uOpacity.value = view.opacity;
      render();
    };
    if (!reduced) gsap.ticker.add(loop);
    else points.position.y = hero.y;

    return () => {
      gsap.ticker.remove(loop);
      ro.disconnect();
      triggers.forEach((t) => t.kill());
      window.removeEventListener("pointermove", onMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      uniforms.current = null;
    };
  }, []);

  // Role toggles fade the matching waves in and out.
  useEffect(() => {
    const mix = uniforms.current?.uMix.value as THREE.Vector3 | undefined;
    if (!mix) return;
    const on = (k: SignalKey) => (solo === null || solo === k ? 1 : 0);
    const target = { x: on("engineer"), y: on("manager"), z: on("designer") };
    if (reducedMotion()) {
      mix.set(target.x, target.y, target.z);
      renderNow.current();
    } else {
      gsap.to(mix, { ...target, duration: 0.9, ease: "power2.out" });
    }
  }, [solo]);

  // The load moment: a flat field that tunes in once the page is revealed.
  useEffect(() => {
    const tune = uniforms.current?.uTune;
    if (!ready || !tune || reducedMotion()) return;
    gsap.to(tune, { value: 1, duration: 2.4, ease: "power3.out", delay: 0.3 });
  }, [ready]);

  if (fallback) {
    return (
      <div className="field">
        <Waveform solo={solo} />
      </div>
    );
  }
  return <div className="field" ref={host} aria-hidden="true" />;
}
