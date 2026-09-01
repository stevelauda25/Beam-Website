import { useLayoutEffect, useRef, useState } from 'react';
import { HeroWorkspaceDemo } from './product-demo/HeroWorkspaceDemo';
import styles from './HeroVisual.module.css';

const canvasWidth = 1440;

export function HeroVisual() {
  const visualRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    const updateScale = () => setScale(visual.getBoundingClientRect().width / canvasWidth);
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(visual);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={visualRef} className={styles.visual} role="group" aria-label="Interactive Beam file manager demo">
      <div className={styles.canvas} style={{ transform: `translateX(-50%) scale(${scale})` }}>
        <svg className={styles.background} viewBox="0 0 1440 540" width="1440" height="540" fill="none" aria-hidden="true">
          <g opacity="0.9">
            <rect width="1440" height="540" fill="#FAFAFA" />
            <rect x="132" width="1176" height="680.661" rx="11.5107" fill="url(#hero-frame)" fillOpacity="0.04" />
            <rect x="137.49" y="5.48961" width="1164.56" height="669.682" rx="5.75533" fill="white" />
          </g>
          <defs>
            <linearGradient id="hero-frame" x1="132" y1="0" x2="1181.55" y2="860.416" gradientUnits="userSpaceOnUse">
              <stop />
              <stop offset="1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div className={styles.appClip}>
          <HeroWorkspaceDemo />
        </div>

        <div className={styles.fade} aria-hidden="true" />
      </div>
    </div>
  );
}
