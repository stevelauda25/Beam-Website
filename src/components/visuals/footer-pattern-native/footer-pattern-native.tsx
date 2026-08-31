import { useEffect, useId, useRef } from 'react';
import styles from './footer-pattern-native.module.css';

const ARTWORK_WIDTH = 1562;
const ARTWORK_HEIGHT = 463;
const GRID_STEP = 5.3289;

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_mouse_strength;
uniform float u_pointer_speed;
uniform vec2 u_click;
uniform float u_click_age;

const vec2 ART = vec2(1562.0, 463.0);
const float STEP = 5.3289;

float gridDistance(float value, float spacing) {
  return abs(fract(value / spacing + 0.5) - 0.5) * spacing;
}

float stroke(float distanceToLine, float width, float antialias) {
  return 1.0 - smoothstep(width * 0.5, width * 0.5 + antialias, distanceToLine);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / u_resolution.x, 1.0 - gl_FragCoord.y / u_resolution.y);
  vec2 p = uv * ART;
  vec2 center = vec2(781.0, 193.0);

  vec2 centerDelta = p - center;
  float centerDistance = length(centerDelta);
  vec2 centerDirection = centerDelta / max(centerDistance, 0.001);
  float breathingWave = sin(centerDistance * 0.052 - u_time * 1.18)
    * 1.35 * exp(-centerDistance / 650.0);
  p += centerDirection * breathingWave;

  vec2 mouseDelta = p - u_mouse;
  float mouseDistance = length(mouseDelta);
  float mouseInfluence = exp(-pow(mouseDistance / 175.0, 2.0)) * u_mouse_strength;
  p -= mouseDelta / max(mouseDistance, 0.001) * mouseInfluence * (5.8 + u_pointer_speed * 3.0);

  if (u_click_age < 1.6) {
    vec2 clickDelta = p - u_click;
    float clickDistance = length(clickDelta);
    float clickRadius = u_click_age * 360.0;
    float ring = exp(-pow((clickDistance - clickRadius) / 25.0, 2.0));
    float life = 1.0 - smoothstep(0.0, 1.6, u_click_age);
    p += clickDelta / max(clickDistance, 0.001) * ring * life * 7.5;
  }

  float pixel = max(ART.x / u_resolution.x, ART.y / u_resolution.y);
  float minorX = stroke(gridDistance(p.x - 1.00136, STEP), 0.0625, pixel);
  float minorY = stroke(gridDistance(460.47462 - p.y, STEP), 0.0625, pixel);
  float majorX = stroke(gridDistance(p.x - 1.00136, STEP * 4.0), 0.125, pixel);
  float majorY = stroke(gridDistance(460.47462 - p.y, STEP * 4.0), 0.125, pixel);

  float verticalClip = step(1.0, p.x) * step(p.x, 1558.0) * step(41.0, p.y) * step(p.y, 439.0);
  float horizontalClip = step(2.0, p.y) * step(p.y, 461.0);
  float minorGrid = max(minorX * verticalClip, minorY * horizontalClip) * 0.6;
  float majorGrid = max(majorX * verticalClip, majorY * horizontalClip);

  vec2 ellipse = vec2((p.x - 781.0) / 1079.79, (p.y - 193.0) / 177.5);
  float fade = 1.0 - smoothstep(0.0, 0.858171, length(ellipse));
  float localLight = mouseInfluence * (0.045 + u_pointer_speed * 0.075);
  float grid = max(minorGrid, majorGrid) * fade * (0.2 + localLight) * 0.6;

  vec3 panelColor = vec3(41.0 / 255.0) + vec3(grid);
  gl_FragColor = vec4(panelColor, 1.0);
}`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create the footer shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader error';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function StaticPattern({
  maskId,
  gradientId,
}: {
  maskId: string;
  gradientId: string;
}) {
  return (
    <svg
      className={styles.fallback}
      viewBox={`0 0 ${ARTWORK_WIDTH} ${ARTWORK_HEIGHT}`}
      aria-hidden="true"
    >
      <rect width={ARTWORK_WIDTH} height={ARTWORK_HEIGHT} fill="#292929" />
      <g opacity="0.12">
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={ARTWORK_WIDTH}
          height={ARTWORK_HEIGHT}
        >
          <rect
            width={ARTWORK_WIDTH}
            height={ARTWORK_HEIGHT}
            fill={`url(#${gradientId})`}
          />
        </mask>
        <g mask={`url(#${maskId})`}>
          {Array.from({ length: 293 }, (_, index) => (
            <line
              key={`v-${index}`}
              x1={1.00136 + index * GRID_STEP}
              y1="439"
              x2={1.00136 + index * GRID_STEP}
              y2="41"
              stroke="white"
              strokeWidth={index % 4 === 0 ? 0.125 : 0.0625}
              strokeLinecap="round"
              opacity={index % 4 === 0 ? 1 : 0.6}
            />
          ))}
          {Array.from({ length: 87 }, (_, index) => (
            <line
              key={`h-${index}`}
              x1="1591"
              y1={460.47462 - index * GRID_STEP}
              x2="-32.0001"
              y2={460.47462 - index * GRID_STEP}
              stroke="white"
              strokeWidth={index % 4 === 0 ? 0.125 : 0.0625}
              strokeLinecap="round"
              opacity={index % 4 === 0 ? 1 : 0.6}
            />
          ))}
        </g>
      </g>
      <defs>
        <radialGradient
          id={gradientId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(781 193) rotate(90) scale(177.5 1079.79)"
        >
          <stop stopColor="#737373" />
          <stop offset="0.858171" stopColor="#D9D9D9" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function FooterPatternNative() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!root || !canvas || reducedMotion.matches) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return;

    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let animationFrame = 0;
    let visible = false;
    let lastFrame = performance.now();
    let lastPointerTime = lastFrame;
    let clickStarted = -10000;
    const mouse = {
      x: 781,
      y: 193,
      targetX: 781,
      targetY: 193,
      strength: 0,
      targetStrength: 0,
      speed: 0,
    };
    const click = { x: 781, y: 193 };

    try {
      vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      program = gl.createProgram();
      if (!program) throw new Error('Unable to create the footer shader program.');
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(
          gl.getProgramInfoLog(program) ?? 'Unable to link the footer shader.',
        );
      }

      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Unable to create the footer shader buffer.');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(program, 'a_position');
      if (position < 0) throw new Error('Footer shader position is unavailable.');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.useProgram(program);
      root.dataset.ready = 'true';
    } catch (error) {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      console.warn('Interactive footer unavailable; using the SVG fallback.', error);
      return;
    }

    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const time = gl.getUniformLocation(program, 'u_time');
    const mouseUniform = gl.getUniformLocation(program, 'u_mouse');
    const mouseStrength = gl.getUniformLocation(program, 'u_mouse_strength');
    const pointerSpeed = gl.getUniformLocation(program, 'u_pointer_speed');
    const clickUniform = gl.getUniformLocation(program, 'u_click');
    const clickAge = gl.getUniformLocation(program, 'u_click_age');
    const started = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * dpr));
      const height = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (now: number) => {
      animationFrame = 0;
      if (!visible || !program) return;
      resize();
      const frameScale = Math.min(3, (now - lastFrame) / 16.667);
      lastFrame = now;
      const ease = 1 - Math.pow(0.82, frameScale);
      mouse.x += (mouse.targetX - mouse.x) * ease;
      mouse.y += (mouse.targetY - mouse.y) * ease;
      mouse.strength += (mouse.targetStrength - mouse.strength) * ease;
      mouse.speed *= Math.pow(0.9, frameScale);

      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - started) / 1000);
      gl.uniform2f(mouseUniform, mouse.x, mouse.y);
      gl.uniform1f(mouseStrength, mouse.strength);
      gl.uniform1f(pointerSpeed, mouse.speed);
      gl.uniform2f(clickUniform, click.x, click.y);
      gl.uniform1f(clickAge, (now - clickStarted) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animationFrame = window.requestAnimationFrame(draw);
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect();
      const inside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;

      if (!inside) {
        mouse.targetStrength = 0;
        return false;
      }

      const nextX = ((event.clientX - bounds.left) / bounds.width) * ARTWORK_WIDTH;
      const nextY = ((event.clientY - bounds.top) / bounds.height) * ARTWORK_HEIGHT;
      const now = performance.now();
      const distance = Math.hypot(nextX - mouse.targetX, nextY - mouse.targetY);
      mouse.speed = Math.min(1, distance / Math.max(18, now - lastPointerTime));
      mouse.targetX = nextX;
      mouse.targetY = nextY;
      mouse.targetStrength = event.pointerType === 'mouse' ? 1 : 0.55;
      lastPointerTime = now;
      return true;
    };

    const pointerDown = (event: PointerEvent) => {
      if (!updatePointer(event)) return;
      click.x = mouse.targetX;
      click.y = mouse.targetY;
      clickStarted = performance.now();
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible && !animationFrame) {
          lastFrame = performance.now();
          animationFrame = window.requestAnimationFrame(draw);
        } else if (!visible && animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      },
      { rootMargin: '120px' },
    );
    const resizeObserver = new ResizeObserver(resize);
    intersectionObserver.observe(root);
    resizeObserver.observe(root);
    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerdown', pointerDown, { passive: true });

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerdown', pointerDown);
      delete root.dataset.ready;
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.pattern}
      aria-label="Interactive Beam footer grid"
      role="img"
    >
      <StaticPattern
        maskId={`footer-mask-${id}`}
        gradientId={`footer-fade-${id}`}
      />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
}
