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
  const cursorPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactionTimerRef = useRef<number>(Date.now());
  // Exploration is a small intention queue, not a random patrol route.
  const explorationStepRef = useRef(0);
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

    const engine = new SnailEngine(canvasRef.current, w, h);
    engineRef.current = engine;

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

    const handleFeed = (e?: Event) => {
      if (!engineRef.current) return;
      const foodType = (e as CustomEvent | undefined)?.detail?.foodType;
      if (foodType) engineRef.current.feed(foodType);
      else engineRef.current.feed();
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

    // Keep the eyes aware of the owner even when they are working in another
    // application. This is throttled and sends no content back to the renderer.
    cursorPollRef.current = setInterval(() => {
      window.snailAPI.getCursorPoint()
        .then((point) => engineRef.current?.lookAt(point.x, point.y))
        .catch(() => undefined);
    }, 180);

    const move = async () => {
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
      const cursor = await window.snailAPI.getCursorPoint().catch(() => null);
      const step = explorationStepRef.current++ % 4;

      // Each destination has a readable reason: observe the owner, inspect a
      // boundary, or choose the quiet taskbar ledge for a rest. We avoid both
      // random coordinates and invisible desktop-content scraping.
      if (step === 0 && cursor) {
        engineRef.current.setEmotion('curious');
        engineRef.current.lookAt(cursor.x, cursor.y);
        engineRef.current.moveTo(cursor.x, cursor.y);
      } else if (step === 1) {
        engineRef.current.setEmotion('focused');
        engineRef.current.moveTo(width * 0.82, height - 52); // taskbar lookout
      } else if (step === 2) {
        engineRef.current.setEmotion('curious');
        engineRef.current.moveTo(54, height * 0.32); // inspect the desktop edge
      } else {
        engineRef.current.setEmotion('relaxed');
        engineRef.current.moveTo(width * 0.5, height - 48); // warm resting ledge
      }

      autoMoveRef.current = setTimeout(move, step === 3 ? 11000 : 7500);
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
      if (cursorPollRef.current) clearInterval(cursorPollRef.current);
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
    engineRef.current.setDragging(true);
    engineRef.current.setMouseOver(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (engineRef.current) {
        engineRef.current.dragTo(ev.clientX, ev.clientY);
      }
      setSnailPosition({ x: ev.clientX, y: ev.clientY });
    };

    const onMouseUp = (ev: MouseEvent) => {
      dragRef.current.dragging = false;
      setSnailDragging(false);
      if (engineRef.current) {
        engineRef.current.setMouseOver(false);
        engineRef.current.releaseDrag();
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