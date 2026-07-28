import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { SnailEngine } from './SnailEngine';
import type { Position, Edge, Direction } from '../../../shared/types';

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
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, snailX: 0, snailY: 0 });
  const autoMoveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimerRef = useRef<number>(Date.now());
  const [isIdle, setIsIdle] = useState(false);

  const {
    snail, setSnailPosition, setSnailAnimation,
    setSnailEmotion, setSnailDirection, setSnailEdge,
    setSnailDragging, setSnailVisible, setSnailSleeping,
  } = useStore();

  const width = 400;
  const height = 300;

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new SnailEngine(canvasRef.current, width, height);
    engineRef.current = engine;
    engine.spawnAnimation();

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
      engine.celebrateAnimation();
    };

    const handlePomodoro = () => {
      engine.danceAnimation();
    };

    window.addEventListener('snail:celebrate', handleCelebrate);
    window.addEventListener('pomodoro:start', handlePomodoro);

    startAutoMovement();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('snail:celebrate', handleCelebrate);
      window.removeEventListener('pomodoro:start', handlePomodoro);
      if (autoMoveRef.current) clearTimeout(autoMoveRef.current);
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAutoMovement = useCallback(() => {
    const move = () => {
      if (!engineRef.current || snail.isDragging || snail.animation === 'sleeping') {
        autoMoveRef.current = setTimeout(move, 2000);
        return;
      }

      const inactiveTime = Date.now() - interactionTimerRef.current;
      if (inactiveTime > 120000 && snail.animation === 'idle') {
        engineRef.current.setAnimation('sleeping');
        setSnailSleeping(true);
        autoMoveRef.current = setTimeout(move, 3000);
        return;
      }

      if (snail.animation === 'waving' ||
          snail.animation === 'dancing' || snail.animation === 'celebrating') {
        autoMoveRef.current = setTimeout(move, 3000);
        return;
      }

      const currentPos = engineRef.current.getPosition();
      const margin = 40;
      const stepSize = 60 + Math.random() * 80;

      let targetX = currentPos.x;
      let targetY = currentPos.y;

      // Random walk within bounds
      const choices: Array<{ x: number; y: number }> = [];

      // Horizontal moves (along bottom area)
      if (currentPos.x > margin) choices.push({ x: currentPos.x - stepSize, y: height - 60 + Math.random() * 30 });
      if (currentPos.x < width - margin) choices.push({ x: currentPos.x + stepSize, y: height - 60 + Math.random() * 30 });

      // Vertical moves
      if (currentPos.y > margin) choices.push({ x: currentPos.x + (Math.random() - 0.5) * 40, y: currentPos.y - stepSize * 0.5 });
      if (currentPos.y < height - margin) choices.push({ x: currentPos.x + (Math.random() - 0.5) * 40, y: currentPos.y + stepSize * 0.5 });

      if (choices.length > 0) {
        const choice = choices[Math.floor(Math.random() * choices.length)];

        // Clamp within bounds
        targetX = Math.max(margin, Math.min(width - margin, choice.x));
        targetY = Math.max(margin, Math.min(height - margin, choice.y));

        const dist = Math.hypot(targetX - currentPos.x, targetY - currentPos.y);
        const duration = dist * 15 * (1 / (snail.personality.responseSpeed || 1));

        engineRef.current.moveTo(targetX, targetY, Math.max(1500, duration));
      }

      const nextDelay = 3000 + Math.random() * 4000;
      autoMoveRef.current = setTimeout(move, nextDelay);
    };

    autoMoveRef.current = setTimeout(move, 1000);
  }, [snail.isDragging, snail.animation, snail.personality.responseSpeed, setSnailSleeping]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!engineRef.current) return;

    interactionTimerRef.current = Date.now();
    if (snail.isSleeping) {
      engineRef.current.setAnimation('idle');
      setSnailSleeping(false);
      startAutoMovement();
    }

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      snailX: e.clientX,
      snailY: e.clientY,
    };

    setSnailDragging(true);
    setSnailAnimation('idle');
    setSnailEmotion('curious');

    engineRef.current.lookAt(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      if (engineRef.current) {
        engineRef.current.teleportTo(ev.clientX, ev.clientY);
      }
    };

    const onMouseUp = () => {
      dragRef.current.dragging = false;
      setSnailDragging(false);

      const deltaX = Math.abs(dragRef.current.startX - dragRef.current.snailX);
      const deltaY = Math.abs(dragRef.current.startY - dragRef.current.snailY);

      if (deltaX < 3 && deltaY < 3) {
        setSnailEmotion('happy');
        startAutoMovement();
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [snail.isSleeping, setSnailDragging, setSnailAnimation, setSnailEmotion, setSnailSleeping, startAutoMovement]);

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
    }
  }, [snail.isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (engineRef.current && !snail.isDragging) {
      engineRef.current.setEmotion('happy');
    }
  }, [snail.isDragging]);

  return (
    <motion.div
      ref={containerRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
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
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </motion.div>
  );
};
