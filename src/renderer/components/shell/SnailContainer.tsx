import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { SnailEngine } from './SnailEngine';

interface SnailContainerProps {
  onDoubleClick: () => void;
  onRightClick: (x: number, y: number) => void;
  onSendMessage: (text: string) => void;
}

export const SnailContainer: React.FC<SnailContainerProps> = ({
  onDoubleClick,
  onRightClick,
  onSendMessage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnailEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });
  const autoMoveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimerRef = useRef<number>(Date.now());
  const sizeRef = useRef({ width: window.innerWidth, height: window.innerHeight });

  const isDraggingRef = useRef(false);
  const animationRef = useRef<string>('idle');

  const {
    snail, setSnailPosition, setSnailAnimation,
    setSnailEmotion, setSnailDirection,
    setSnailDragging, setSnailSleeping, setSnailVisible,
  } = useStore();

  useEffect(() => {
    isDraggingRef.current = snail.isDragging;
    animationRef.current = snail.animation;
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    sizeRef.current = { width: w, height: h };

    const engine = new SnailEngine(w, h);
    engineRef.current = engine;

    engine.initialize(canvasRef.current).then(() => {
      engine.spawnAnimation();
    });

    const tick = () => {
      if (engineRef.current) {
        const pos = engineRef.current.getPosition();
        setSnailPosition(pos);
        setSnailAnimation(engineRef.current.getState());
        setSnailDirection(engineRef.current.getDirection());
      }
      animationFrame = requestAnimationFrame(tick);
    };

    let animationFrame = requestAnimationFrame(tick);

    const handleCelebrate = () => {
      if (engineRef.current) engineRef.current.celebrateAnimation();
    };

    const handlePomodoro = () => {
      if (engineRef.current) engineRef.current.danceAnimation();
    };

    const handleFeed = () => {
      if (engineRef.current) engineRef.current.feed();
    };

    const handlePet = () => {
      if (engineRef.current) engineRef.current.pet();
    };

    window.addEventListener('snail:celebrate', handleCelebrate);
    window.addEventListener('pomodoro:start', handlePomodoro);
    window.addEventListener('snail:feed', handleFeed);
    window.addEventListener('snail:pet', handlePet);

    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      sizeRef.current = { width: nw, height: nh };
      engineRef.current?.resize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    const move = () => {
      if (!engineRef.current || isDraggingRef.current || animationRef.current === 'sleeping' ||
          animationRef.current === 'spawning' || animationRef.current === 'hiding' ||
          animationRef.current === 'eating' || animationRef.current === 'petting') {
        autoMoveRef.current = setTimeout(move, 2000);
        return;
      }

      const inactiveTime = Date.now() - interactionTimerRef.current;
      if (inactiveTime > 120000 && animationRef.current === 'idle') {
        engineRef.current.setAnimation('sleeping');
        setSnailSleeping(true);
        autoMoveRef.current = setTimeout(move, 3000);
        return;
      }

      if (animationRef.current === 'waving' || animationRef.current === 'dancing' ||
          animationRef.current === 'celebrating' || animationRef.current === 'thinking') {
        autoMoveRef.current = setTimeout(move, 3000);
        return;
      }

      const { width, height } = sizeRef.current;
      const margin = 60;
      const targetX = margin + Math.random() * (width - margin * 2);
      const targetY = margin + Math.random() * (height - margin * 2);

      engineRef.current.moveTo(targetX, targetY);

      const nextDelay = 3000 + Math.random() * 5000;
      autoMoveRef.current = setTimeout(move, nextDelay);
    };

    autoMoveRef.current = setTimeout(move, 1000);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('snail:celebrate', handleCelebrate);
      window.removeEventListener('pomodoro:start', handlePomodoro);
      window.removeEventListener('snail:feed', handleFeed);
      window.removeEventListener('snail:pet', handlePet);
      window.removeEventListener('resize', handleResize);
      if (autoMoveRef.current) clearTimeout(autoMoveRef.current);
      engine.destroy();
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!engineRef.current) return;

    interactionTimerRef.current = Date.now();
    if (snail.isSleeping) {
      engineRef.current.setAnimation('idle');
      setSnailSleeping(false);
    }

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
    };

    setSnailDragging(true);
    setSnailAnimation('idle');
    setSnailEmotion('curious');
    engineRef.current.lookAt(e.clientX, e.clientY);
    engineRef.current.setMouseOver(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (engineRef.current) {
        engineRef.current.teleportTo(ev.clientX, ev.clientY);
      }
      setSnailPosition({ x: ev.clientX, y: ev.clientY });
    };

    const onMouseUp = (ev: MouseEvent) => {
      dragRef.current.dragging = false;
      setSnailDragging(false);
      if (engineRef.current) {
        engineRef.current.setMouseOver(false);
      }

      const deltaX = Math.abs(dragRef.current.startX - ev.clientX);
      const deltaY = Math.abs(dragRef.current.startY - ev.clientY);

      if (deltaX < 5 && deltaY < 5) {
        setSnailEmotion('happy');
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [snail.isSleeping, setSnailDragging, setSnailAnimation, setSnailEmotion, setSnailSleeping, setSnailPosition]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    interactionTimerRef.current = Date.now();
    if (engineRef.current) {
      engineRef.current.setAnimation('happy');
    }
    onDoubleClick();
  }, [onDoubleClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    interactionTimerRef.current = Date.now();
    onRightClick(e.clientX, e.clientY);
  }, [onRightClick]);

  const handleMouseEnter = useCallback(() => {
    if (engineRef.current && !snail.isDragging) {
      engineRef.current.setAnimation('idle');
      engineRef.current.setEmotion('curious');
      engineRef.current.setMouseOver(true);
    }
  }, [snail.isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (engineRef.current && !snail.isDragging) {
      engineRef.current.setEmotion('happy');
      engineRef.current.setMouseOver(false);
    }
  }, [snail.isDragging]);

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0 }}
      animate={{ opacity: snail.opacity }}
      transition={{ duration: 0.5 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </motion.div>
  );
};