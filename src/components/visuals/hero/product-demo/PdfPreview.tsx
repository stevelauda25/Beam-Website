import { useEffect, useRef, useState } from 'react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import styles from './HeroWorkspaceDemo.module.css';

export function PdfPreview({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let isCancelled = false;
    let loadingTask: import('pdfjs-dist').PDFDocumentLoadingTask | undefined;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    async function renderPdf() {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      loadingTask = pdfjs.getDocument({ url });
      const document = await loadingTask.promise;
      const page = await document.getPage(1);
      if (isCancelled || !containerRef.current || !canvasRef.current) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const displayScale = Math.min(containerRef.current.clientWidth / baseViewport.width, 1.35);
      const pixelScale = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: displayScale * pixelScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Canvas is unavailable');

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width / pixelScale}px`;
      canvas.style.height = `${viewport.height / pixelScale}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
      if (!isCancelled) setStatus('ready');
    }

    void renderPdf().catch(() => {
      if (!isCancelled) setStatus('error');
    });

    return () => {
      isCancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [url]);

  return (
    <div className={styles.pdfDocument} ref={containerRef} aria-label={`${title}, page 1`}>
      {status === 'loading' && <span className={styles.pdfStatus}>Loading PDF…</span>}
      {status === 'error' && <span className={styles.pdfStatus}>PDF preview unavailable.</span>}
      <canvas ref={canvasRef} className={status === 'ready' ? styles.pdfCanvasReady : styles.pdfCanvas} />
    </div>
  );
}
