import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useSpring } from 'framer-motion';

const FRAME_COUNT = 40;
const frames = Array.from({ length: FRAME_COUNT }, (_, index) =>
  `/frames/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`,
);

function SequenceCanvas({ progress, loadedFrames, setLoaded }) {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const smoothedProgress = useSpring(progress, { stiffness: 90, damping: 24, mass: 0.35 });

  useEffect(() => {
    let mounted = true;
    const loaded = [];

    Promise.all(frames.map((src) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    }))).then((images) => {
      if (!mounted) return;
      images.forEach((image) => image && loaded.push(image));
      setLoaded(loaded);
      setIsLoading(false);
    });

    return () => { mounted = false; };
  }, [setLoaded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedFrames.length) return undefined;
    const context = canvas.getContext('2d');
    let animationFrame;
    let latestProgress = smoothedProgress.get();

    const resizeCanvas = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const scheduleDraw = (value) => {
      latestProgress = value;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const imageIndex = Math.min(loadedFrames.length - 1, Math.floor(latestProgress * loadedFrames.length));
        const image = loadedFrames[imageIndex];
        if (!image) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        context.fillStyle = '#f5f6f2';
        context.fillRect(0, 0, width, height);
        const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      });
    };

    resizeCanvas();
    scheduleDraw(latestProgress);
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      scheduleDraw(latestProgress);
    });
    resizeObserver.observe(canvas);
    const unsubscribe = smoothedProgress.on('change', scheduleDraw);
    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [loadedFrames, smoothedProgress]);

  return (
    <>
      <canvas ref={canvasRef} className="sequence-canvas" aria-label="Animated view of the BIS Sahayak system" />
      {isLoading && <div className="loader"><span className="loader-ring" /></div>}
    </>
  );
}

export default function App() {
  const sectionRef = useRef(null);
  const [loadedFrames, setLoadedFrames] = useState([]);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  return (
    <main ref={sectionRef} className="scrolly-page">
      <div className="sticky-stage" id="top">
        <SequenceCanvas progress={scrollYProgress} loadedFrames={loadedFrames} setLoaded={setLoadedFrames} />
      </div>
    </main>
  );
}
