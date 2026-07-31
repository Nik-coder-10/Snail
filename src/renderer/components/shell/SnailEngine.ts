import type { Position, Direction, AnimationState, EmotionalState } from '../../../shared/types';
import { COLORS, PHYSICS, SKINS } from '../../styles/tokens';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: number;
  alpha: number; rotation: number; rotationSpeed: number;
  shape: 'circle' | 'star' | 'heart';
}

interface TrailSegment {
  x: number; y: number; alpha: number; width: number;
}

const DEFAULT_SCALE = PHYSICS.DEFAULT_SCALE;
const MAX_TRAIL_LENGTH = PHYSICS.MAX_TRAIL_LENGTH;
const SLIME_ALPHA = PHYSICS.SLIME_ALPHA;
const CRAWL_SPEED_MULTIPLIER = PHYSICS.CRAWL_SPEED_MULTIPLIER;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(t, 1);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function hexColor(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

export class SnailEngine {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private animFrame: number = 0;

  private currentState: AnimationState = 'idle';
  private currentEmotion: EmotionalState = 'happy';
  private direction: Direction = 'right';
  private position: Position = { x: 200, y: 200 };
  private velocity: Position = { x: 0, y: 0 };
  private targetPos: Position | null = null;

  private stateTime = 0;
  private totalTime = 0;
  private blinkTimer = rand(PHYSICS.BLINK_INTERVAL_MIN, PHYSICS.BLINK_INTERVAL_MAX);
  private blinkProgress = 0;
  private isBlinking = false;

  private bodySquash = 1;
  private bodyStretch = 1;
  private bodyWavePhase = 0;
  private bodyCompression = 0;
  private headTilt = 0;
  private bodyBaseY = 0;

  private shellLagX = 0;
  private shellLagY = 0;
  private shellRotate = 0;
  private shellBob = 0;
  private shellSettleTimer = 0;
  private shellSettleVelocity = 0;
  private bodyStopSquish = 0;

  private eyeScaleY = 1;
  private eyeStalkHeightL = 1;
  private eyeStalkHeightR = 1;
  private eyeStalkSwayL = 0;
  private eyeStalkSwayR = 0;
  private pupilOffX = 0;
  private pupilOffY = 0;
  private eyeBounceL = 0;
  private eyeBounceR = 0;
  private eyeBounceVL = 0;
  private eyeBounceVR = 0;

  private feelerSwayL = 0;
  private feelerSwayR = 0;
  private blushAlpha = 0;
  private mouthScale = 1;
  private mouthOpenness = 0;

  private skinColor: number = COLORS.accent;
  private skinColorLight: number = COLORS.accentLight;
  private skinColorDark: number = COLORS.accentDark;
  private shellColor: number = COLORS.accentLight;
  private shellColorDark: number = COLORS.accentDark;
  private shellColorLight: number = COLORS.accentExtraLight;

  private mouseOver = false;
  private mouseX = 0;
  private mouseY = 0;

  private trailPoints: TrailSegment[] = [];
  private isMoving = false;
  private crawlPhase = 0;
  private crawlPauseTimer = 0;
  private isPausedDuringCrawl = false;
  private crawlCycleTimer = 0;

  private particles: Particle[] = [];
  private animationOverride: ((ctx: CanvasRenderingContext2D, time: number) => boolean) | null = null;

  private sleepZZTimer = 0;
  private zzzs: Array<{ x: number; y: number; alpha: number; size: number; speed: number; phase: number }> = [];

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.position = { x: width / 2, y: height * 0.7 };

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D not available');
    this.ctx = ctx;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    this.startLoop();
    this.spawnAnimation();
  }

  private startLoop(): void {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      this.update(dt);
      this.render();

      this.animFrame = requestAnimationFrame(loop);
    };

    this.animFrame = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.totalTime += dt;
    this.stateTime += dt;

    if (this.animationOverride) return;

    this.updateBlink(dt);
    this.applyBreathing(dt);
    this.applyBodyWave(dt);
    this.applyShellInertia(dt);
    this.applyEyeAnimations(dt);
    this.applyAntennaSway(dt);

    const prevState = this.currentState;

    switch (this.currentState) {
      case 'walking': this.updateWalking(dt); break;
      case 'sleeping': this.updateSleeping(dt); break;
      case 'spawning': this.updateSpawn(dt); break;
      case 'hiding': this.updateHide(dt); break;
      case 'dancing': case 'celebrating': this.updateCelebration(dt); break;
      case 'eating': this.updateEating(dt); break;
      case 'petting': this.updatePetting(dt); break;
      case 'talking': this.updateTalking(dt); break;
    }

    if (prevState === 'walking' && this.currentState !== 'walking') {
      this.bodyStopSquish = PHYSICS.BODY_SQUISH_ON_STOP;
      this.eyeBounceL = PHYSICS.EYE_BOUNCE_STRENGTH;
      this.eyeBounceR = PHYSICS.EYE_BOUNCE_STRENGTH * 0.85;
      this.eyeBounceVL = 0.3;
      this.eyeBounceVR = 0.25;
    }

    if (this.bodyStopSquish > 0) {
      this.bodyStopSquish = lerp(this.bodyStopSquish, 0, PHYSICS.BODY_SQUISH_RECOVERY);
      this.bodyCompression += this.bodyStopSquish;
    }

    this.updateTrail(dt);
    this.updateParticles(dt);
    this.updateZZZ(dt);
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    if (this.animationOverride) {
      const done = this.animationOverride(ctx, this.totalTime);
      if (done) this.animationOverride = null;
      return;
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y + this.bodyBaseY);

    const flip = this.direction === 'left' ? -1 : 1;
    ctx.scale(flip * this.bodySquash, this.bodyStretch);

    this.drawTrail(ctx);
    this.drawShadow(ctx);
    this.drawBody(ctx);
    this.drawShell(ctx);
    this.drawAntennae(ctx);
    this.drawEyeStalks(ctx);
    this.drawEyes(ctx);
    this.drawBlush(ctx);
    this.drawMouth(ctx);
    this.drawFeeler(ctx);

    ctx.restore();

    this.drawParticles(ctx);
    this.drawZZZ(ctx);
    this.drawFood(ctx);
    this.drawPetHand(ctx);
  }

  // ── Drawing Methods ──

  private drawShadow(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;
    ctx.save();
    ctx.globalAlpha = 0.6 + this.bodyCompression * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(0, bodyHeight * 0.6, bodyLength * 0.5, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;
    const sx = 1 + this.bodyCompression;
    const sy = 1 - this.bodyCompression * 0.5;

    ctx.save();
    ctx.scale(sx, sy);

    // Foot
    ctx.fillStyle = hexColor(this.skinColorDark);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(0, bodyHeight * 0.45, bodyLength * 0.48, 8 * s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Main body
    ctx.fillStyle = hexColor(this.skinColor);
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLength * 0.5, bodyHeight * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body gradient (inner glow)
    ctx.fillStyle = hexColor(this.skinColor);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.12, -bodyHeight * 0.08, bodyLength * 0.35, bodyHeight * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.08, -bodyHeight * 0.2, bodyLength * 0.28, bodyHeight * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.2, -bodyHeight * 0.28, bodyLength * 0.15, bodyHeight * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawShell(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const bodyHeight = 28 * s;
    const shellRadius = 32 * s;
    const cx = 5 * s + this.shellLagX;
    const cy = -bodyHeight * 0.5 - 5 * s + this.shellLagY + this.shellBob;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.shellRotate);

    // Shell base
    ctx.fillStyle = hexColor(this.shellColor);
    ctx.beginPath();
    ctx.ellipse(0, 0, shellRadius * 0.85, shellRadius * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner shadow
    ctx.fillStyle = hexColor(this.shellColorDark);
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.ellipse(0, -shellRadius * 0.08, shellRadius * 0.7, shellRadius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Shell outline
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, shellRadius * 0.85, shellRadius * 1.0, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Spiral
    ctx.strokeStyle = hexColor(this.shellColorDark);
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();

    const maxR = shellRadius * 0.7;
    const turns = 3.5;
    const spiralPoints = 60;

    for (let i = 0; i <= spiralPoints; i++) {
      const t = i / spiralPoints;
      const r = maxR * t;
      const angle = t * turns * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Inner spiral
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    const innerTurns = 2;
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const r = shellRadius * 0.5 * t;
      const angle = t * innerTurns * Math.PI * 2 + 0.5;
      const x = shellRadius * 0.15 + Math.cos(angle) * r;
      const y = -shellRadius * 0.1 + Math.sin(angle) * r * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Shell highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(-shellRadius * 0.25, -shellRadius * 0.35, shellRadius * 0.3, shellRadius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.ellipse(-shellRadius * 0.1, -shellRadius * 0.5, shellRadius * 0.2, shellRadius * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawAntennae(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;

    ctx.save();
    ctx.strokeStyle = hexColor(this.skinColorDark);
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5 * s;
    ctx.lineCap = 'round';

    const sL = this.feelerSwayL * 0.5;
    ctx.save();
    ctx.translate(bodyLength * 0.1, -bodyHeight * 0.35);
    ctx.rotate(sL);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(0, -bodyHeight * 0.85, -bodyLength * 0.25, -bodyHeight * 0.75, -bodyLength * 0.2, -bodyHeight * 0.35);
    ctx.stroke();
    ctx.restore();

    const sR = this.feelerSwayR * 0.5;
    ctx.save();
    ctx.translate(bodyLength * 0.18, -bodyHeight * 0.35);
    ctx.rotate(sR);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(bodyLength * 0.1, -bodyHeight * 0.8, bodyLength * 0.35, -bodyHeight * 0.7, bodyLength * 0.3, -bodyHeight * 0.3);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawEyeStalks(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;

    ctx.save();
    ctx.strokeStyle = hexColor(this.skinColorLight);
    ctx.lineWidth = 2.5 * s;
    ctx.lineCap = 'round';

    // Left stalk
    ctx.save();
    ctx.translate(bodyLength * 0.2, -bodyHeight * 0.35);
    ctx.rotate(this.eyeStalkSwayL);
    const eLY = -bodyHeight * 0.25 - 10 * s * this.eyeStalkHeightL;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, eLY);
    ctx.stroke();
    ctx.restore();

    // Right stalk
    ctx.save();
    ctx.translate(bodyLength * 0.3, -bodyHeight * 0.35);
    ctx.rotate(this.eyeStalkSwayR);
    const eRY = -bodyHeight * 0.25 - 10 * s * this.eyeStalkHeightR;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, eRY);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawEyes(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;
    const eyeRadius = 7 * s;

    const eLX = bodyLength * 0.2;
    const eRX = bodyLength * 0.3;
    const eLY = -bodyHeight * 0.6 - 10 * s * this.eyeStalkHeightL;
    const eRY = -bodyHeight * 0.6 - 10 * s * this.eyeStalkHeightR;

    // Left eye
    ctx.save();
    ctx.translate(eLX, eLY);
    ctx.scale(1, this.eyeScaleY);

    ctx.fillStyle = hexColor(COLORS.eyeWhite);
    ctx.beginPath();
    ctx.arc(eLX - eLX, 0, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexColor(COLORS.eyeBlue);
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, eyeRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-eyeRadius * 0.3, -eyeRadius * 0.3, eyeRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = hexColor(COLORS.pupil);
    ctx.beginPath();
    ctx.arc(1.5 * s + this.pupilOffX, this.pupilOffY, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(2.5 * s + this.pupilOffX, -1.5 * s + this.pupilOffY, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Right eye
    ctx.save();
    ctx.translate(eRX, eRY);
    ctx.scale(1, this.eyeScaleY);

    ctx.fillStyle = hexColor(COLORS.eyeWhite);
    ctx.beginPath();
    ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexColor(COLORS.eyeBlue);
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, eyeRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-eyeRadius * 0.3, -eyeRadius * 0.3, eyeRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexColor(COLORS.pupil);
    ctx.beginPath();
    ctx.arc(1.5 * s + this.pupilOffX, this.pupilOffY, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(2.5 * s + this.pupilOffX, -1.5 * s + this.pupilOffY, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawMouth(ctx: CanvasRenderingContext2D): void {
    if (this.currentState === 'sleeping') return;

    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;
    const mx = bodyLength * 0.25;
    const my = bodyHeight * 0.15;

    ctx.save();
    ctx.strokeStyle = hexColor(this.skinColorDark);
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.8 * s;
    ctx.lineCap = 'round';

    switch (this.currentEmotion) {
      case 'happy':
      case 'excited':
      case 'celebrating':
      case 'grateful':
        ctx.beginPath();
        ctx.arc(mx, my, 5 * s, 0.15, Math.PI - 0.15);
        ctx.stroke();
        break;
      case 'confused':
        ctx.beginPath();
        ctx.moveTo(mx - 4 * s, my + 1 * s);
        ctx.lineTo(mx - 1 * s, my + 3 * s);
        ctx.lineTo(mx + 2 * s, my + 1 * s);
        ctx.stroke();
        break;
      case 'thinking':
      case 'working':
        ctx.beginPath();
        ctx.moveTo(mx - 5 * s, my + 2 * s);
        ctx.lineTo(mx + 5 * s, my + 2 * s);
        ctx.stroke();
        break;
      case 'surprised':
        ctx.fillStyle = hexColor(COLORS.pupil);
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(mx, my + 1 * s, 4 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'sleepy':
        ctx.beginPath();
        ctx.arc(mx, my, 3 * s, 0.3, Math.PI - 0.3);
        ctx.stroke();
        break;
      case 'curious':
        ctx.beginPath();
        ctx.moveTo(mx - 3 * s, my + 2 * s);
        ctx.quadraticCurveTo(mx, my - 1 * s, mx + 3 * s, my + 2 * s);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(mx, my, 3.5 * s, 0.15, Math.PI - 0.15);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  private drawBlush(ctx: CanvasRenderingContext2D): void {
    if (this.currentEmotion !== 'happy' && this.currentEmotion !== 'grateful' &&
        this.currentEmotion !== 'excited' && this.blushAlpha < 0.01) return;

    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;

    ctx.save();
    ctx.fillStyle = hexColor(COLORS.blush);
    ctx.globalAlpha = Math.max(0.15, this.blushAlpha);

    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.15, bodyHeight * 0.12, 6 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.35, bodyHeight * 0.12, 6 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFeeler(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;

    ctx.save();
    ctx.strokeStyle = hexColor(this.skinColor);
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.2 * s;

    ctx.save();
    ctx.translate(-bodyLength * 0.35, -bodyHeight * 0.1);
    ctx.rotate(this.feelerSwayL);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-bodyLength * 0.2, bodyHeight * 0.2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(-bodyLength * 0.35, bodyHeight * 0.05);
    ctx.rotate(this.feelerSwayR);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-bodyLength * 0.2, bodyHeight * 0.15);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trailPoints.length < 2) return;

    ctx.save();
    for (let i = 1; i < this.trailPoints.length; i++) {
      const p0 = this.trailPoints[i - 1];
      const p1 = this.trailPoints[i];
      const ageRatio = i / this.trailPoints.length;
      const alpha = p0.alpha * ageRatio;
      const width = p0.width * ageRatio;

      if (alpha < 0.01) continue;

      const wobble = Math.sin(this.totalTime * 0.001 + i) * 0.5;
      ctx.strokeStyle = hexColor(this.shellColorLight);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p0.x + wobble, p0.y);
      ctx.lineTo(p1.x + wobble, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Animation Update Methods ──

  private updateBlink(dt: number): void {
    if (this.currentState === 'sleeping') {
      this.eyeScaleY = lerp(this.eyeScaleY, 0.05, 0.12);
      return;
    }

    const minInterval = this.mouseOver ? PHYSICS.BLINK_INTERVAL_MIN * 0.4 : PHYSICS.BLINK_INTERVAL_MIN;

    if (!this.isBlinking) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.isBlinking = true;
        this.blinkProgress = 0;
      }
    }

    if (this.isBlinking) {
      this.blinkProgress += dt;
      const t = this.blinkProgress / PHYSICS.BLINK_DURATION;
      if (t < 0.2) {
        this.eyeScaleY = lerp(this.eyeScaleY, 0.05, 0.5);
      } else if (t < 0.5) {
        this.eyeScaleY = lerp(this.eyeScaleY, 1, 0.4);
      } else {
        this.eyeScaleY = lerp(this.eyeScaleY, 1, 0.06);
      }
      if (t >= 1) {
        this.isBlinking = false;
        this.blinkTimer = rand(minInterval, PHYSICS.BLINK_INTERVAL_MAX);
      }
    }
  }

  private applyBreathing(dt: number): void {
    let speed: number = PHYSICS.BREATHE_SPEED;
    switch (this.currentState) {
      case 'sleeping': speed = 0.012; break;
      case 'walking': speed = 0.05; break;
      case 'dancing': case 'celebrating': speed = 0.1; break;
      case 'thinking': speed = 0.02; break;
    }

    const targetSquash = 1 + Math.sin(this.totalTime * speed) * 0.015;
    const targetStretch = 1 + Math.sin(this.totalTime * speed + Math.PI) * 0.01;
    const breathVal = Math.sin(this.totalTime * speed) * 2.5;

    this.bodySquash = lerp(this.bodySquash, targetSquash, 0.05);
    this.bodyStretch = lerp(this.bodyStretch, targetStretch, 0.05);
    this.bodyBaseY = lerp(this.bodyBaseY, breathVal * 0.15, 0.08);
  }

  private applyBodyWave(dt: number): void {
    if (this.currentState === 'walking' && !this.isPausedDuringCrawl) {
      this.bodyWavePhase += dt * PHYSICS.BODY_WAVE_SPEED * CRAWL_SPEED_MULTIPLIER;
      const wave = Math.sin(this.bodyWavePhase);
      this.bodyCompression = lerp(this.bodyCompression, wave * 0.08, 0.1);
      this.headTilt = lerp(this.headTilt, Math.sin(this.bodyWavePhase * 1.5 + 1) * 0.03, 0.08);
    } else {
      this.bodyCompression = lerp(this.bodyCompression, 0, 0.05);
      this.headTilt = lerp(this.headTilt, 0, 0.05);
    }
  }

  private applyShellInertia(dt: number): void {
    if (this.currentState === 'walking' && !this.isPausedDuringCrawl) {
      const dx = this.velocity.x * dt * 0.05;
      const dy = this.velocity.y * dt * 0.05;
      this.shellLagX = lerp(this.shellLagX, -dx * 0.5, PHYSICS.SHELL_INERTIA_STRENGTH);
      this.shellLagY = lerp(this.shellLagY, -dy * 0.3, PHYSICS.SHELL_INERTIA_STRENGTH);
      this.shellSettleTimer = 0;
      this.shellSettleVelocity = 0;
    } else {
      this.shellLagX = lerp(this.shellLagX, 0, 0.06);
      this.shellLagY = lerp(this.shellLagY, 0, 0.06);

      this.shellSettleTimer += dt;
      if (this.shellSettleTimer < 600) {
        this.shellSettleVelocity = this.shellSettleVelocity * PHYSICS.SHELL_SETTLE_DAMPING
          + Math.sin(this.shellSettleTimer * 0.012) * 0.08;
        this.shellLagX += this.shellSettleVelocity;
        this.shellLagY += Math.sin(this.shellSettleTimer * 0.015 + 0.5) * 0.05;
      } else {
        this.shellSettleVelocity = 0;
      }
    }

    const bodySway = Math.sin(this.totalTime * 0.002) * 0.5;
    if (this.currentState === 'walking') {
      this.shellRotate = lerp(this.shellRotate, bodySway * 0.02, 0.08);
    } else if (this.currentState === 'dancing' || this.currentState === 'celebrating') {
      this.shellRotate = lerp(this.shellRotate, Math.sin(this.totalTime * 0.005) * 0.1, 0.1);
    } else {
      const settleRotate = this.shellSettleTimer < 400
        ? Math.sin(this.shellSettleTimer * 0.01) * 0.015 * (1 - this.shellSettleTimer / 400)
        : 0;
      this.shellRotate = lerp(this.shellRotate, settleRotate, 0.06);
    }

    this.shellBob = lerp(this.shellBob, this.bodyCompression * (-2), 0.1);
  }

  private applyEyeAnimations(dt: number): void {
    let targetEyeX = 0;
    let targetEyeY = 0;

    if (this.mouseOver && this.currentState !== 'sleeping') {
      const dx = this.mouseX - this.position.x;
      const dy = this.mouseY - this.position.y;
      const maxDist = 60;
      const dist = Math.min(Math.hypot(dx, dy), maxDist);
      const norm = dist / maxDist;
      const angle = Math.atan2(dy, dx);
      targetEyeX = Math.cos(angle) * norm * 3;
      targetEyeY = Math.sin(angle) * norm * 2;
    }

    this.pupilOffX = lerp(this.pupilOffX, targetEyeX, 0.06);
    this.pupilOffY = lerp(this.pupilOffY, targetEyeY, 0.06);

    let lTarget = 1;
    let rTarget = 1;
    if (this.currentState === 'sleeping') {
      lTarget = 0.3; rTarget = 0.3;
    } else if (this.currentEmotion === 'curious') {
      lTarget = 1.2; rTarget = 1.1;
    } else if (this.currentEmotion === 'excited') {
      lTarget = 1.15; rTarget = 1.15;
    }

    this.eyeStalkHeightL = lerp(this.eyeStalkHeightL, lTarget, 0.04);
    this.eyeStalkHeightR = lerp(this.eyeStalkHeightR, rTarget, 0.04);

    const swayAmp = this.currentState === 'walking' ? 0.06 : 0.03;
    this.eyeStalkSwayL = lerp(this.eyeStalkSwayL, Math.sin(this.totalTime * 0.033) * swayAmp, 0.08);
    this.eyeStalkSwayR = lerp(this.eyeStalkSwayR, Math.sin(this.totalTime * 0.027 + 0.8) * swayAmp, 0.08);

    if (this.currentState !== 'walking') {
      this.eyeBounceVL *= PHYSICS.EYE_BOUNCE_DAMPING;
      this.eyeBounceVR *= PHYSICS.EYE_BOUNCE_DAMPING;
      this.eyeStalkHeightL = lerp(this.eyeStalkHeightL, this.eyeStalkHeightL + this.eyeBounceVL, 0.02);
      this.eyeStalkHeightR = lerp(this.eyeStalkHeightR, this.eyeStalkHeightR + this.eyeBounceVR, 0.02);
    }
  }

  private applyAntennaSway(dt: number): void {
    let amp = this.currentState === 'walking' ? 0.04 : 0.02;
    if (this.currentEmotion === 'curious' || this.currentEmotion === 'excited') amp = 0.08;

    this.feelerSwayL = lerp(this.feelerSwayL, Math.sin(this.totalTime * 0.024) * amp, 0.06);
    this.feelerSwayR = lerp(this.feelerSwayR, Math.sin(this.totalTime * 0.016 + 1.2) * amp, 0.06);
  }

  private updateWalking(dt: number): void {
    if (!this.targetPos) { this.setAnimation('idle'); return; }
    if (this.isPausedDuringCrawl) {
      this.crawlPauseTimer -= dt;
      if (this.crawlPauseTimer <= 0) this.isPausedDuringCrawl = false;
      return;
    }

    const dx = this.targetPos.x - this.position.x;
    const dy = this.targetPos.y - this.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      this.velocity = { x: 0, y: 0 };
      this.position = { ...this.targetPos };
      this.targetPos = null;
      this.setAnimation('idle');
      return;
    }

    const normX = dx / dist;
    const normY = dy / dist;
    const speedMultiplier = Math.min(dist / PHYSICS.APPROACH_SLOW_DOWN_DIST, 1);
    const speed = 0.04 * Math.max(speedMultiplier, 0.15);

    this.velocity.x = lerp(this.velocity.x, normX * speed * dt * 0.5, 0.1);
    this.velocity.y = lerp(this.velocity.y, normY * speed * dt * 0.5, 0.1);
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.direction = dx >= 0 ? 'right' : 'left';

    this.crawlCycleTimer += dt * CRAWL_SPEED_MULTIPLIER;
    if (this.crawlCycleTimer > 3000 + rand(0, 2000)) {
      this.crawlCycleTimer = 0;
      if (Math.random() < 0.3) {
        this.isPausedDuringCrawl = true;
        this.crawlPauseTimer = 500 + Math.random() * 1500;
      }
    }

    this.blushAlpha = lerp(this.blushAlpha, 0, 0.02);
    this.shellSettleTimer = 0;
    this.shellSettleVelocity = 0;
  }

  private updateSleeping(dt: number): void {
    this.sleepZZTimer += dt;
    if (this.sleepZZTimer > 1500) {
      this.sleepZZTimer = 0;
      this.addZZZ();
    }
    this.blushAlpha = lerp(this.blushAlpha, 0, 0.02);
  }

  private spawnStartTime = 0;
  private updateSpawn(dt: number): void {
    if (this.stateTime > 1200) this.setAnimation('idle');
  }

  private updateHide(dt: number): void {
    /* handled by animation override */
  }

  private celebrationTimer = 0;
  private celebrationPhase = 0;
  private updateCelebration(dt: number): void {
    this.celebrationTimer += dt;
    if (this.celebrationTimer > this.celebrationPhase * 500 + 200) {
      this.celebrationPhase++;
      if (this.celebrationPhase < 4) {
        const types: Array<'burst' | 'confetti' | 'sparkle'> = ['burst', 'confetti', 'sparkle', 'confetti'];
        this.spawnParticles(8 + rand(0, 8), types[this.celebrationPhase % types.length]);
      }
    }
    if (this.celebrationTimer > 3000) { this.setAnimation('idle'); this.setEmotion('happy'); }
    this.blushAlpha = lerp(this.blushAlpha, 0.3, 0.02);
  }

  private foodAlpha = 0;
  private foodScale = 0;
  private foodPhase = 0;
  private updateEating(dt: number): void {
    if (this.stateTime < 600) {
      this.foodScale = this.stateTime / 600;
      this.foodAlpha = Math.min(1, this.stateTime / 300);
    } else if (this.stateTime < 4000) {
      this.mouthOpenness = lerp(this.mouthOpenness, 0.3 + Math.sin(this.stateTime * 0.04) * 0.1, 0.08);
      this.blushAlpha = lerp(this.blushAlpha, 0.2, 0.01);
      if (this.stateTime > 1000 && this.stateTime < 1100) this.spawnParticles(3, 'sparkle');
    } else if (this.stateTime < 5000) {
      this.foodAlpha = lerp(this.foodAlpha, 0, 0.04);
      this.mouthOpenness = lerp(this.mouthOpenness, 0, 0.06);
      this.blushAlpha = lerp(this.blushAlpha, 0.3, 0.02);
    } else {
      this.foodAlpha = 0;
      this.mouthOpenness = 0;
      this.blushAlpha = lerp(this.blushAlpha, 0.15, 0.02);
      this.setAnimation('happy');
      this.setEmotion('grateful');
    }
  }

  private petPhase = 0;
  private petTimer = 0;
  private petHandAlpha = 0;
  private updatePetting(dt: number): void {
    this.petTimer += dt;
    if (this.stateTime < 400) {
      this.petHandAlpha = this.stateTime / 400;
    } else if (this.stateTime < 2000) {
      this.blushAlpha = lerp(this.blushAlpha, 0.4, 0.03);
      if (this.petTimer > 300) {
        this.petTimer = 0;
        this.petPhase++;
        if (this.petPhase === 1) this.spawnParticles(4, 'sparkle');
        else if (this.petPhase === 2) this.spawnParticles(3, 'burst');
        else if (this.petPhase === 3) this.spawnHearts(3);
      }
      this.bodySquash = lerp(this.bodySquash, 0.95, 0.04);
    } else if (this.stateTime < 2500) {
      this.petHandAlpha = lerp(this.petHandAlpha, 0, 0.06);
      this.blushAlpha = lerp(this.blushAlpha, 0.2, 0.02);
    } else {
      this.petHandAlpha = 0;
      this.blushAlpha = lerp(this.blushAlpha, 0, 0.02);
      this.setAnimation('happy');
      this.setEmotion('grateful');
    }
    this.mouthScale = lerp(this.mouthScale, 1.2, 0.05);
    this.bodyCompression = lerp(this.bodyCompression, 0.03, 0.05);
  }

  private updateTalking(dt: number): void {
    const talkPhase = Math.sin(this.stateTime * 0.015);
    this.mouthOpenness = lerp(this.mouthOpenness, 0.3 + talkPhase * 0.15, 0.1);
    this.headTilt = lerp(this.headTilt, talkPhase * 0.02, 0.06);
    if (this.stateTime > 3000) this.setAnimation('idle');
  }

  private updateTrail(dt: number): void {
    if (this.currentState === 'walking') {
      if (this.totalTime % 100 < dt) {
        this.trailPoints.push({ x: this.position.x, y: this.position.y + 15, alpha: SLIME_ALPHA, width: 6 + Math.random() * 4 });
        if (this.trailPoints.length > MAX_TRAIL_LENGTH) this.trailPoints.shift();
      }
    }
    if (this.currentState !== 'walking' && this.trailPoints.length > 0) {
      this.trailPoints.splice(0, 1);
      if (this.trailPoints.length === 0) this.slimeTrailDrawn = false;
    }
  }

  private slimeTrailDrawn = false;

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.rotation += p.rotationSpeed;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private updateZZZ(dt: number): void {
    for (let i = this.zzzs.length - 1; i >= 0; i--) {
      const z = this.zzzs[i];
      z.y -= z.speed;
      z.alpha -= 0.003;
      z.x += Math.sin(this.totalTime * 0.008 + z.phase) * 0.2;
      if (z.alpha <= 0) this.zzzs.splice(i, 1);
    }
  }

  // ── Particle Drawing ──

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = hexColor(p.color as unknown as number);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'star') {
        this.drawStarShape(ctx, 0, 0, p.size);
      } else if (p.shape === 'heart') {
        this.drawHeartShape(ctx, 0, 0, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawStarShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    const points = 5;
    const innerR = r * 0.45;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? innerR : r;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawHeartShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.3);
    ctx.bezierCurveTo(cx + r, cy + r, cx + r * 0.3, cy - r * 0.5, cx, cy - r * 0.2);
    ctx.bezierCurveTo(cx - r * 0.3, cy - r * 0.5, cx - r, cy + r, cx, cy + r * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  private drawFood(ctx: CanvasRenderingContext2D): void {
    if (this.foodAlpha <= 0) return;
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    ctx.save();
    ctx.globalAlpha = this.foodAlpha;
    ctx.translate(bodyLength * 0.55, -5 * s);
    ctx.scale(this.foodScale, this.foodScale);
    ctx.fillStyle = hexColor(COLORS.accent);
    ctx.beginPath();
    ctx.ellipse(0, 0, 10 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexColor(COLORS.accentDark);
    ctx.globalAlpha = 0.5 * this.foodAlpha;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#166534';
    ctx.globalAlpha = 0.6 * this.foodAlpha;
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5 * s, 0);
    ctx.stroke();
    ctx.restore();
  }

  private drawPetHand(ctx: CanvasRenderingContext2D): void {
    if (this.petHandAlpha <= 0) return;
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    ctx.save();
    ctx.globalAlpha = this.petHandAlpha;
    ctx.fillStyle = hexColor(COLORS.hand);
    ctx.beginPath();
    ctx.arc(bodyLength * 0.55, -bodyLength * 0.45 + Math.sin(this.stateTime * 0.005) * 3, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexColor(COLORS.handShadow);
    ctx.globalAlpha = 0.5 * this.petHandAlpha;
    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.5, -bodyLength * 0.48, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawZZZ(ctx: CanvasRenderingContext2D): void {
    for (const z of this.zzzs) {
      ctx.save();
      ctx.globalAlpha = z.alpha;
      ctx.fillStyle = hexColor(COLORS.zzz);
      ctx.font = `bold ${z.size}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('z', z.x, z.y);
      ctx.restore();
    }
  }

  // ── Public API ──

  public spawnAnimation(): void {
    this.currentState = 'spawning';
    this.stateTime = 0;
    this.position = { x: this.width / 2, y: this.height * 0.7 };
    this.spawnParticles(30, 'sparkle');

    const startTime = this.totalTime;
    const duration = 1000;

    this.animationOverride = (ctx, time) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = this.easeOutBack(t);

      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.globalAlpha = eased;
      ctx.scale(0.1 + eased * 0.9, 0.1 + eased * 0.9);
      // Draw a simplified snail during spawn
      ctx.fillStyle = hexColor(this.skinColor);
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexColor(this.shellColor);
      ctx.beginPath();
      ctx.ellipse(5, -16, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (t >= 1) {
        ctx.clearRect(0, 0, this.width, this.height);
        return true;
      }
      return false;
    };
  }

  public hideAnimation(onComplete: () => void): void {
    this.spawnParticles(16, 'sparkle');
    const startTime = this.totalTime;
    const duration = 500;

    this.animationOverride = (ctx, time) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = Math.pow(t, 3);

      ctx.clearRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.globalAlpha = 1 - eased;
      ctx.scale(1 - eased * 0.6, 1 - eased * 0.6);
      this.drawBody(ctx);
      this.drawShell(ctx);
      ctx.restore();
      this.drawParticles(ctx);

      if (t >= 1) {
        this.currentState = 'hiding';
        onComplete();
        return true;
      }
      return false;
    };
  }

  public moveTo(x: number, y: number): void {
    this.targetPos = { x: clamp(x, 20, this.width - 20), y: clamp(y, 20, this.height - 20) };
    this.isPausedDuringCrawl = false;
    this.crawlPauseTimer = 0;
    this.crawlCycleTimer = 0;
    this.direction = this.targetPos.x - this.position.x >= 0 ? 'right' : 'left';
    this.setAnimation('walking');
  }

  public setAnimation(state: AnimationState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateTime = 0;

    switch (state) {
      case 'sleeping':
        this.eyeScaleY = 0.05;
        this.sleepZZTimer = 0;
        break;
      case 'dancing': case 'celebrating':
        this.celebrationTimer = 0;
        this.celebrationPhase = 0;
        this.spawnParticles(18, 'confetti');
        break;
      case 'eating':
        this.foodAlpha = 1;
        this.foodScale = 0.5;
        this.spawnParticles(5, 'sparkle');
        break;
      case 'petting':
        this.petPhase = 0;
        this.petTimer = 0;
        this.petHandAlpha = 0;
        break;
      case 'idle': case 'happy':
        this.animationOverride = null;
        this.targetPos = null;
        this.velocity = { x: 0, y: 0 };
        break;
    }
  }

  public setEmotion(emotion: EmotionalState): void {
    this.currentEmotion = emotion;
  }

  public feed(): void {
    this.setAnimation('eating');
    this.setEmotion('excited');
  }

  public pet(): void {
    this.setAnimation('petting');
    this.setEmotion('grateful');
    this.spawnHearts(2);
  }

  public danceAnimation(): void {
    this.setAnimation('dancing');
    this.setEmotion('excited');
    this.spawnParticles(20, 'confetti');
    setTimeout(() => {
      if (this.currentState === 'dancing') { this.setAnimation('idle'); this.setEmotion('happy'); }
    }, 3000);
  }

  public celebrateAnimation(): void {
    this.setAnimation('celebrating');
    this.setEmotion('celebrating');
    this.spawnParticles(35, 'confetti');
  }

  public lookAt(mouseX: number, mouseY: number): void {
    const dx = mouseX - this.position.x;
    if (Math.abs(dx) > 20) this.direction = dx >= 0 ? 'right' : 'left';
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.mouseOver = true;
  }

  public setMouseOver(over: boolean): void {
    this.mouseOver = over;
  }

  public teleportTo(x: number, y: number): void {
    this.position = { x: clamp(x, 0, this.width), y: clamp(y, 0, this.height) };
  }

  public getPosition(): Position { return { ...this.position }; }
  public getState(): AnimationState { return this.currentState; }
  public getDirection(): Direction { return this.direction; }

  public setSkin(skin: string): void {
    const colors = SKINS[skin] || SKINS.classic;
    this.skinColor = colors.body;
    this.skinColorLight = colors.bodyLight;
    this.skinColorDark = colors.bodyDark;
    this.shellColor = colors.shell;
    this.shellColorDark = colors.shellDark;
    this.shellColorLight = colors.shellLight;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx.canvas.width = width;
    this.ctx.canvas.height = height;
  }

  public destroy(): void {
    cancelAnimationFrame(this.animFrame);
    this.particles = [];
    this.trailPoints = [];
    this.zzzs = [];
  }

  private addZZZ(): void {
    this.zzzs.push({
      x: 20 + Math.random() * 20,
      y: -30 + Math.random() * 10,
      alpha: 0.7,
      size: 12 + Math.random() * 8,
      speed: 0.1 + Math.random() * 0.2,
      phase: Math.random() * 10,
    });
  }

  private spawnHearts(count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.position.x + (Math.random() - 0.5) * 20,
        y: this.position.y - 20 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1 - Math.random() * 2,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        size: 3 + Math.random() * 4,
        color: COLORS.heart,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        shape: 'heart',
      });
    }
  }

  private spawnParticles(count: number, type: 'burst' | 'confetti' | 'sparkle' = 'burst'): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'confetti' ? 1 + Math.random() * 2.5 : 0.3 + Math.random() * 2;
      this.particles.push({
        x: this.position.x + (Math.random() - 0.5) * 20,
        y: this.position.y - 10 + (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'confetti' ? 2 : 1),
        life: type === 'sparkle' ? 15 + Math.random() * 20 : 30 + Math.random() * 40,
        maxLife: 60,
        size: type === 'sparkle' ? 1.5 + Math.random() * 2 : 2 + Math.random() * 3.5,
        color: this.getParticleColor(),
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.12,
        shape: type === 'sparkle' ? 'star' : (Math.random() < 0.3 ? 'star' : 'circle'),
      });
    }
  }

  private getParticleColor(): number {
    const palette = [
      this.skinColor, COLORS.accent, 0x60a5fa, COLORS.blush, COLORS.zzz,
      COLORS.accentLight, COLORS.white,
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}