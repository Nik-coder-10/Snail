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

interface BodySeg {
  restX: number;
  baseWidth: number;
}

interface MotionParams {
  speedMul: number;
  bounceMul: number;
  stretchMul: number;
  pauseChance: number;
  lookChance: number;
}

const DEFAULT_SCALE = PHYSICS.DEFAULT_SCALE;
const MAX_TRAIL_LENGTH = PHYSICS.MAX_TRAIL_LENGTH;
const SLIME_ALPHA = PHYSICS.SLIME_ALPHA;
const CRAWL_SPEED_MULTIPLIER = PHYSICS.CRAWL_SPEED_MULTIPLIER;

// Body segments from tail (-) to neck (+). The head assembly attaches at the front.
const SEGMENTS: BodySeg[] = [
  { restX: -44, baseWidth: 3.5 },  // tail tip
  { restX: -32, baseWidth: 6.5 },  // rear
  { restX: -20, baseWidth: 9.5 },  // shell area
  { restX: -8,  baseWidth: 11 },   // mid
  { restX: 4,   baseWidth: 11 },   // front-mid
  { restX: 16,  baseWidth: 9 },    // front
  { restX: 26,  baseWidth: 6.5 },  // neck
];
const HEAD_X = 34;
const SHELL_ANCHOR = -14;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(t, 1);
}

function damp(a: number, b: number, rate: number, dt: number): number {
  return lerp(a, b, 1 - Math.exp(-rate * dt));
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

type IdleBehaviorName =
  | 'breathe' | 'look' | 'blink' | 'cleanShell' | 'scratch' | 'stretch'
  | 'peek' | 'yawn' | 'wiggle' | 'inspect' | 'settle' | 'comeOut';

interface IdleBehavior {
  name: IdleBehaviorName;
  min: number;
  max: number;
}

const IDLE_BEHAVIORS: IdleBehavior[] = [
  { name: 'breathe',    min: 2500, max: 4500 },
  { name: 'look',       min: 1200, max: 2800 },
  { name: 'blink',      min: 600,  max: 1500 },
  { name: 'cleanShell', min: 1800, max: 3200 },
  { name: 'scratch',    min: 1200, max: 2200 },
  { name: 'stretch',    min: 1500, max: 2600 },
  { name: 'peek',       min: 1400, max: 2500 },
  { name: 'yawn',       min: 1600, max: 2800 },
  { name: 'wiggle',     min: 1000, max: 1800 },
  { name: 'inspect',    min: 1600, max: 3000 },
  { name: 'settle',     min: 2000, max: 4000 },
  { name: 'comeOut',    min: 1400, max: 2400 },
];

export class SnailEngine {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private animFrame: number = 0;

  // ── Core state ──
  private currentState: AnimationState = 'idle';
  private currentEmotion: EmotionalState = 'happy';
  private direction: Direction = 'right';
  private position: Position = { x: 200, y: 200 };
  private velocity: Position = { x: 0, y: 0 };
  private targetPos: Position | null = null;

  private totalTime = 0;
  private stateTime = 0;

  // ── Locomotion ──
  private crawlPhase = 0;
  private crawlAmp = 0;
  private movePhase: 'idle' | 'prepare' | 'crawl' | 'stop' = 'idle';
  private moveTimer = 0;
  private crawlSpeedMul = 1;
  private stopping = false;

  // ── Body deformation ──
  private bodyBaseY = 0;
  private bodyStretch = 1;
  private bodySquash = 1;
  private bodyCompress = 0;
  private leanForward = 0;

  // ── Head assembly ──
  private headX = 0;
  private headY = 0;
  private headRot = 0;
  private headLookX = 0;
  private headLookY = 0;
  private headLookActive = 0;
  private headBreathe = 0;

  // ── Eye stalks ──
  private stalkLenL = 1;
  private stalkLenR = 1;
  private stalkSwayL = 0;
  private stalkSwayR = 0;
  private stalkBounceVL = 0;
  private stalkBounceVR = 0;
  private eyeCloseL = 0;
  private eyeCloseR = 0;
  private blinkPhaseL = 0;
  private blinkPhaseR = 0;
  private pupilX = 0;
  private pupilY = 0;
  private eyeLookX = 0;
  private eyeLookY = 0;

  // ── Shell ──
  private shellPos = { x: 0, y: 0, vx: 0, vy: 0 };
  private shellRot = 0;
  private shellRotV = 0;
  private shellSettle = 0;

  // ── Feelers / antennae ──
  private feelerSwayL = 0;
  private feelerSwayR = 0;

  // ── Turn system ──
  private turning = false;
  private turnProgress = 0;
  private turnFrom = 1;
  private turnTo = 1;

  // ── Blink system ──
  private nextBlinkL = rand(1800, 5000);
  private nextBlinkR = rand(2200, 6000);

  // ── Idle behavior ──
  private idleTimer = 2000;
  private idleBehavior: IdleBehaviorName = 'breathe';
  private lastIdleBehavior: IdleBehaviorName = 'breathe';
  private behaviorStart = 0;
  private idleLookTarget = { x: 0, y: 0 };

  // ── Personality / friendship ──
  private friendship = 0;

  // ── Blush / mouth ──
  private blushAlpha = 0;
  private mouthOpenness = 0;

  // ── Colors ──
  private skinColor: number = COLORS.accent;
  private skinColorLight: number = COLORS.accentLight;
  private skinColorDark: number = COLORS.accentDark;
  private shellColor: number = COLORS.accentLight;
  private shellColorDark: number = COLORS.accentDark;
  private shellColorLight: number = COLORS.accentExtraLight;

  // ── Interaction ──
  private mouseOver = false;
  private mouseX = 0;
  private mouseY = 0;
  private lastInteractPos: Position | null = null;

  // ── Effects ──
  private trailPoints: TrailSegment[] = [];
  private particles: Particle[] = [];
  private zzzs: Array<{ x: number; y: number; alpha: number; size: number; speed: number; phase: number }> = [];
  private animationOverride: ((ctx: CanvasRenderingContext2D, time: number) => boolean) | null = null;

  private sleepZZTimer = 0;
  private foodAlpha = 0;
  private foodScale = 0;
  private petPhase = 0;
  private petTimer = 0;
  private petHandAlpha = 0;
  private petReaction = 0;
  private celebrationTimer = 0;
  private celebrationPhase = 0;

  private isDragging = false;

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

  // ═══════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════

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
    this.updateIdleBehavior(dt);
    this.applyBreathing(dt);

    const prevState = this.currentState;

    switch (this.currentState) {
      case 'walking':
      case 'turning':
      case 'climbing':
        this.updateWalking(dt);
        break;
      case 'sleeping': this.updateSleeping(dt); break;
      case 'spawning': this.updateSpawn(dt); break;
      case 'dancing': case 'celebrating': this.updateCelebration(dt); break;
      case 'eating': this.updateEating(dt); break;
      case 'petting': this.updatePetting(dt); break;
      case 'talking': case 'listening': case 'thinking': this.updateTalking(dt); break;
      case 'waving': this.updateWaving(dt); break;
    }

    this.updateShell(dt);
    this.updateHead(dt);
    this.updateEyeStalks(dt);
    this.updateTurn(dt);

    if (prevState === 'walking' && this.currentState !== 'walking') {
      this.bodyCompress = 0.08;
      this.shellSettle = 1;
    }
    this.bodyCompress = damp(this.bodyCompress, 0, 4, dt / 1000);

    this.updateTrail(dt);
    this.updateParticles(dt);
    this.updateZZZ(dt);
  }

  // ═══════════════════════════════════════════════
  // LOCOMOTION
  // ═══════════════════════════════════════════════

  public moveTo(x: number, y: number): void {
    const tx = clamp(x, 20, this.width - 20);
    const ty = clamp(y, 20, this.height - 20);

    // Determine horizontal direction
    const dx = tx - this.position.x;
    const newDir: Direction = Math.abs(dx) > 12
      ? (dx >= 0 ? 'right' : 'left')
      : (ty < this.position.y ? 'up' : 'down');

    // Start a turn if horizontal direction changed
    const wasLeft = this.direction === 'left';
    const newLeft = newDir === 'left';
    if (this.currentState === 'walking' && wasLeft !== newLeft) {
      this.beginTurn(wasLeft ? 1 : -1, newLeft ? 1 : -1);
    }

    this.direction = newDir;
    this.targetPos = { x: tx, y: ty };
    this.isPausedDuringCrawl = false;
    this.crawlPauseTimer = 0;
    this.crawlCycleTimer = 0;

    if (this.currentState !== 'walking') {
      this.movePhase = 'prepare';
      this.moveTimer = 0;
      this.setAnimation('walking');
    }
  }

  private isPausedDuringCrawl = false;
  private crawlPauseTimer = 0;
  private crawlCycleTimer = 0;

  private updateWalking(dt: number): void {
    if (!this.targetPos) { this.setAnimation('idle'); return; }

    if (this.isPausedDuringCrawl) {
      this.crawlPauseTimer -= dt;
      this.crawlAmp = damp(this.crawlAmp, 0, 2, dt / 1000);
      if (this.crawlPauseTimer <= 0) this.isPausedDuringCrawl = false;
      return;
    }

    const dx = this.targetPos.x - this.position.x;
    const dy = this.targetPos.y - this.position.y;
    const dist = Math.hypot(dx, dy);

    // ── STOPPING ──
    if (dist < 4) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.position = { ...this.targetPos };
      this.targetPos = null;
      this.crawlAmp = 0;
      this.setAnimation('idle');
      return;
    }

    const motion = this.getMotionParams();

    // ── PREPARE PHASE: lean forward, stretch, shell catches up ──
    if (this.movePhase === 'prepare') {
      this.moveTimer += dt;
      const t = Math.min(this.moveTimer / 380, 1);
      const e = this.easeOut(t);
      this.leanForward = e * 3.5;
      this.bodyStretch = damp(this.bodyStretch, 1 + e * 0.06, 6, dt / 1000);
      if (this.moveTimer >= 380) {
        this.movePhase = 'crawl';
        this.moveTimer = 0;
      }
      return; // no positional movement during prepare
    }

    // ── CRAWL PHASE ──
    this.movePhase = 'crawl';

    const speedMul = motion.speedMul * this.crawlSpeedMul * (this.currentState === 'climbing' ? 0.6 : 1);
    const slowDist = 70;
    const slowMul = clamp(dist / slowDist, 0.25, 1);
    const baseSpeed = 0.055 * speedMul * slowMul;

    // ease toward target velocity
    const desiredVx = (dx / dist) * baseSpeed * dt * 0.5;
    const desiredVy = (dy / dist) * baseSpeed * dt * 0.5;
    this.velocity.x = damp(this.velocity.x, desiredVx, 4, dt / 1000);
    this.velocity.y = damp(this.velocity.y, desiredVy, 4, dt / 1000);

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // crawl wave
    const speedNow = Math.hypot(this.velocity.x, this.velocity.y);
    this.crawlPhase += dt * 0.045 * speedMul;
    this.crawlAmp = damp(this.crawlAmp, clamp(speedNow * 1.1, 0.4, 2.2) * motion.bounceMul, 2, dt / 1000);

    // occasional pause for a sniff
    this.crawlCycleTimer += dt * CRAWL_SPEED_MULTIPLIER;
    if (this.crawlCycleTimer > 3200 + rand(0, 2500)) {
      this.crawlCycleTimer = 0;
      if (Math.random() < motion.pauseChance) {
        this.isPausedDuringCrawl = true;
        this.crawlPauseTimer = 400 + Math.random() * 900;
      }
    }

    // head looks toward destination while walking
    this.headLookTarget(dx / dist, dy / dist, 0.5);
    this.blushAlpha = damp(this.blushAlpha, 0, 3, dt / 1000);

    // random tiny looks while moving
    if (Math.random() < 0.008 * motion.lookChance) {
      this.headLookTarget(rand(-1, 1), rand(-0.6, 0.4), 0.6);
    }
  }

  private headLookTarget(nx: number, ny: number, amount: number): void {
    this.headLookX = nx * amount;
    this.headLookY = ny * amount;
    this.headLookActive = 1;
  }

  // ═══════════════════════════════════════════════
  // TURNING
  // ═══════════════════════════════════════════════

  private beginTurn(fromSign: number, toSign: number): void {
    this.turning = true;
    this.turnProgress = 0;
    this.turnFrom = fromSign;
    this.turnTo = toSign;
    this.headRot = (toSign - fromSign) * 0.5; // head leads the turn
    this.shellRotV += (toSign - fromSign) * 0.01;
  }

  private updateTurn(dt: number): void {
    if (!this.turning) return;
    this.turnProgress += dt / 420;
    if (this.turnProgress >= 1) {
      this.turning = false;
      this.turnProgress = 1;
    }
  }

  // ═══════════════════════════════════════════════
  // SHELL PHYSICS (heavy object)
  // ═══════════════════════════════════════════════

  private updateShell(dt: number): void {
    const dtS = dt / 1000;

    // Shell chases the body anchor with its own inertia
    const targetX = SHELL_ANCHOR + this.leanForward * 0.4;
    const targetY = -8 + this.bodyBaseY * 0.5;

    const k = 5.5;   // spring stiffness
    const c = 0.65;  // damping

    this.shellPos.x += this.shellPos.vx * dtS;
    this.shellPos.y += this.shellPos.vy * dtS;

    const ax = (targetX - this.shellPos.x) * k - this.shellPos.vx * c;
    const ay = (targetY - this.shellPos.y) * k - this.shellPos.vy * c;

    // gravity pulls shell down when climbing
    if (this.currentState === 'climbing') {
      this.shellPos.vy += 90 * dtS;
    }

    this.shellPos.vx += ax * dtS;
    this.shellPos.vy += ay * dtS;

    // settle bounce after stops
    if (this.shellSettle > 0) {
      this.shellSettle = damp(this.shellSettle, 0, 1.4, dtS);
      this.shellPos.vy -= Math.sin(this.totalTime * 0.006) * 40 * this.shellSettle * dtS;
    }

    // shell rotation: lags on turns, wobbles while walking
    const targetRot = -this.velocity.x * 0.0008 + this.shellPos.vx * 0.004;
    const rotSpring = (targetRot - this.shellRot) * 4 - this.shellRotV * 0.5;
    this.shellRotV += rotSpring * dtS;
    this.shellRot += this.shellRotV * dtS;

    // bob with body
    this.shellPos.y += Math.sin(this.totalTime * 0.004) * this.crawlAmp * 0.3 * dtS;
  }

  // ═══════════════════════════════════════════════
  // HEAD ASSEMBLY
  // ═══════════════════════════════════════════════

  private updateHead(dt: number): void {
    const dtS = dt / 1000;

    // head follows crawl wave + look targets
    const wave = Math.sin(this.crawlPhase + 0.5) * this.crawlAmp * 0.35;

    let targetHeadX = this.leanForward + wave * 0.6;
    let targetHeadY = -this.bodyBaseY * 0.4 + Math.sin(this.totalTime * 0.005) * 1;

    // idle behaviors alter head
    switch (this.idleBehavior) {
      case 'look':
      case 'inspect':
        targetHeadX += this.headLookX * 4;
        targetHeadY += this.headLookY * 3;
        break;
      case 'peek':
        targetHeadX += 5;
        break;
      case 'cleanShell':
        targetHeadX += 2;
        break;
      case 'scratch':
        targetHeadY -= 2;
        targetHeadX += Math.sin(this.totalTime * 0.02) * 2;
        break;
      case 'yawn':
        targetHeadY -= 3;
        break;
    }

    if (this.currentEmotion === 'thinking' || this.currentEmotion === 'working') {
      targetHeadY -= 2;
      targetHeadX += Math.sin(this.totalTime * 0.015) * 1.5;
    }
    if (this.currentEmotion === 'confused') {
      targetHeadX += Math.sin(this.totalTime * 0.008) * 2;
    }
    if (this.currentEmotion === 'sleepy' || this.currentState === 'sleeping') {
      targetHeadY += 3;
    }

    // eyes follow cursor
    if (this.mouseOver && this.currentState !== 'sleeping') {
      const dx = this.mouseX - this.position.x;
      const dy = this.mouseY - this.position.y;
      const dist = Math.min(Math.hypot(dx, dy), 80);
      const norm = dist / 80;
      const angle = Math.atan2(dy, dx);
      targetHeadX += Math.cos(angle) * norm * 2;
      targetHeadY += Math.sin(angle) * norm * 1.5;
    }

    this.headX = damp(this.headX, targetHeadX, 6, dtS);
    this.headY = damp(this.headY, targetHeadY, 5, dtS);

    // head rotation toward look target
    const targetRot = (this.headLookX * 0.12 + this.leanForward * 0.01) + (this.turning ? this.headRot * 0.5 : 0);
    this.headRot = damp(this.headRot, targetRot, 5, dtS);

    // pupils look toward look target + cursor
    let lx = this.headLookX * 2.5;
    let ly = this.headLookY * 2.5;
    if (this.mouseOver) {
      const dx = this.mouseX - this.position.x;
      const dy = this.mouseY - this.position.y;
      const dist = Math.min(Math.hypot(dx, dy), 80);
      const norm = dist / 80;
      const angle = Math.atan2(dy, dx);
      lx += Math.cos(angle) * norm * 2;
      ly += Math.sin(angle) * norm * 1.5;
    }
    this.pupilX = damp(this.pupilX, lx, 7, dtS);
    this.pupilY = damp(this.pupilY, ly, 7, dtS);
  }

  // ═══════════════════════════════════════════════
  // EYE STALKS (independent physics)
  // ═══════════════════════════════════════════════

  private updateEyeStalks(dt: number): void {
    const dtS = dt / 1000;

    let targetLen = 1;
    if (this.currentState === 'sleeping' || this.currentEmotion === 'sleepy') {
      targetLen = 0.55;
    } else if (this.currentEmotion === 'surprised') {
      targetLen = 1.35;
    } else if (this.currentEmotion === 'excited' || this.currentEmotion === 'celebrating') {
      targetLen = 1.25;
    } else if (this.currentEmotion === 'curious') {
      targetLen = 1.15;
    }

    // eye stalks droop when head looks down, rise when looking up
    targetLen -= clamp(this.headLookY, -0.4, 0.4) * 0.3;
    if (this.idleBehavior === 'cleanShell' || this.idleBehavior === 'yawn') {
      targetLen = 0.75;
    }

    this.stalkLenL = damp(this.stalkLenL, targetLen, 4, dtS);
    this.stalkLenR = damp(this.stalkLenR, targetLen * rand(0.97, 1.03), 4, dtS);

    // sway while walking
    const swayAmp = this.currentState === 'walking' ? 0.09 : 0.04;
    const sL = Math.sin(this.totalTime * 0.02) * swayAmp * this.crawlAmp;
    const sR = Math.sin(this.totalTime * 0.018 + 0.7) * swayAmp * this.crawlAmp;
    this.stalkSwayL = damp(this.stalkSwayL, sL, 6, dtS);
    this.stalkSwayR = damp(this.stalkSwayR, sR, 6, dtS);

    // spring bounce (from stopping / excitement)
    this.stalkBounceVL *= 0.96;
    this.stalkBounceVR *= 0.96;
    this.stalkLenL += this.stalkBounceVL * dtS;
    this.stalkLenR += this.stalkBounceVR * dtS;

    if (this.currentEmotion === 'excited' || this.currentEmotion === 'celebrating') {
      this.stalkBounceVL += Math.sin(this.totalTime * 0.01) * 0.5 * dtS;
      this.stalkBounceVR += Math.sin(this.totalTime * 0.01 + 1) * 0.5 * dtS;
    }
  }

  private updateBlink(dt: number): void {
    if (this.currentState === 'sleeping') {
      this.eyeCloseL = damp(this.eyeCloseL, 1, 8, dt / 1000);
      this.eyeCloseR = damp(this.eyeCloseR, 1, 8, dt / 1000);
      return;
    }
    if (this.currentEmotion === 'sleepy') {
      this.eyeCloseL = 0.4 + Math.sin(this.totalTime * 0.004) * 0.3;
      this.eyeCloseR = 0.4 + Math.sin(this.totalTime * 0.004 + 1) * 0.3;
      return;
    }

    const min = this.mouseOver ? 1200 : 1800;

    this.nextBlinkL -= dt;
    if (this.nextBlinkL <= 0) {
      this.blinkPhaseL = 0;
      this.nextBlinkL = rand(min, 5500);
    }
    this.blinkPhaseL += dt / 140;
    this.eyeCloseL = Math.sin(Math.min(this.blinkPhaseL, 1) * Math.PI);

    this.nextBlinkR -= dt;
    if (this.nextBlinkR <= 0) {
      this.blinkPhaseR = 0;
      this.nextBlinkR = rand(min, 6500);
    }
    this.blinkPhaseR += dt / 140;
    this.eyeCloseR = Math.sin(Math.min(this.blinkPhaseR, 1) * Math.PI);

    if (this.currentEmotion === 'surprised') {
      this.eyeCloseL = damp(this.eyeCloseL, 0, 8, dt / 1000);
      this.eyeCloseR = damp(this.eyeCloseR, 0, 8, dt / 1000);
    }
  }

  // ═══════════════════════════════════════════════
  // IDLE LIFE
  // ═══════════════════════════════════════════════

  private updateIdleBehavior(dt: number): void {
    if (this.currentState !== 'idle' && this.currentState !== 'happy') {
      this.idleTimer = 500;
      return;
    }

    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
      this.idleTimer = this.chooseIdleBehavior();
      this.behaviorStart = this.totalTime;
    }

    // look behavior: random eye/head wander
    if (this.idleBehavior === 'look' || this.idleBehavior === 'inspect') {
      if (Math.random() < 0.01) {
        this.idleLookTarget = { x: rand(-1, 1), y: rand(-0.7, 0.5) };
      }
      this.headLookX = damp(this.headLookX, this.idleLookTarget.x, 2, dt / 1000);
      this.headLookY = damp(this.headLookY, this.idleLookTarget.y, 2, dt / 1000);
    } else {
      this.headLookX = damp(this.headLookX, 0, 1.5, dt / 1000);
      this.headLookY = damp(this.headLookY, 0, 1.5, dt / 1000);
    }
  }

  private chooseIdleBehavior(): number {
    let candidates = IDLE_BEHAVIORS.filter(b => b.name !== this.lastIdleBehavior);
    // sleeping/curious bias
    if (this.currentEmotion === 'curious') {
      candidates = candidates.filter(b => b.name === 'look' || b.name === 'inspect' || b.name === 'peek');
      if (candidates.length === 0) candidates = IDLE_BEHAVIORS;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastIdleBehavior = pick.name;
    this.idleBehavior = pick.name;
    return rand(pick.min, pick.max);
  }

  // ═══════════════════════════════════════════════
  // BREATHING & DEFORMATION
  // ═══════════════════════════════════════════════

  private applyBreathing(dt: number): void {
    let speed = 0.03;
    let amp = 0.015;
    switch (this.currentState) {
      case 'sleeping': speed = 0.012; amp = 0.02; break;
      case 'walking': speed = 0.05; amp = 0.01; break;
      case 'dancing': case 'celebrating': speed = 0.1; amp = 0.02; break;
    }

    const breathe = Math.sin(this.totalTime * speed);
    const squash = 1 + breathe * amp * this.getMotionParams().bounceMul;
    this.bodySquash = damp(this.bodySquash, squash, 4, dt / 1000);
    this.bodyBaseY = damp(this.bodyBaseY, breathe * 0.4, 4, dt / 1000);

    // stretch while walking
    const walkingStretch = this.currentState === 'walking' ? 1 + this.crawlAmp * 0.015 : 1;
    this.bodyStretch = damp(this.bodyStretch, walkingStretch, 2, dt / 1000);
  }

  private getMotionParams(): MotionParams {
    switch (this.currentEmotion) {
      case 'happy': return { speedMul: 1.15, bounceMul: 1.25, stretchMul: 1.1, pauseChance: 0.35, lookChance: 1.2 };
      case 'excited': case 'celebrating': return { speedMul: 1.45, bounceMul: 1.7, stretchMul: 1.3, pauseChance: 0.1, lookChance: 1 };
      case 'curious': return { speedMul: 0.85, bounceMul: 1.1, stretchMul: 1, pauseChance: 0.55, lookChance: 1.6 };
      case 'sleepy': return { speedMul: 0.55, bounceMul: 0.8, stretchMul: 0.9, pauseChance: 0.7, lookChance: 0.4 };
      case 'confused': return { speedMul: 0.7, bounceMul: 0.9, stretchMul: 0.95, pauseChance: 0.6, lookChance: 1 };
      case 'thinking': case 'working': return { speedMul: 0.8, bounceMul: 0.9, stretchMul: 0.95, pauseChance: 0.6, lookChance: 1.4 };
      default: return { speedMul: 1, bounceMul: 1, stretchMul: 1, pauseChance: 0.35, lookChance: 1 };
    }
  }

  // ═══════════════════════════════════════════════
  // STATE BEHAVIORS
  // ═══════════════════════════════════════════════

  private updateSleeping(dt: number): void {
    this.sleepZZTimer += dt;
    if (this.sleepZZTimer > 1500) {
      this.sleepZZTimer = 0;
      this.addZZZ();
    }
    this.blushAlpha = damp(this.blushAlpha, 0, 2, dt / 1000);
  }

  private updateSpawn(dt: number): void {
    if (this.stateTime > 1200) this.setAnimation('idle');
  }

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
    this.blushAlpha = damp(this.blushAlpha, 0.3, 2, dt / 1000);
  }

  private updateWaving(dt: number): void {
    this.stalkSwayL = Math.sin(this.totalTime * 0.02) * 0.4;
    this.stalkSwayR = Math.sin(this.totalTime * 0.02 + 1) * 0.4;
    if (this.stateTime > 1500) this.setAnimation('idle');
  }

  private updateTalking(dt: number): void {
    const talkPhase = Math.sin(this.stateTime * 0.015);
    this.mouthOpenness = damp(this.mouthOpenness, 0.3 + talkPhase * 0.15, 8, dt / 1000);
    this.headX += talkPhase * 0.5;
    if (this.stateTime > 3000) this.setAnimation('idle');
  }

  // ── Eating ──
  private updateEating(dt: number): void {
    if (this.stateTime < 600) {
      this.foodScale = this.stateTime / 600;
      this.foodAlpha = Math.min(1, this.stateTime / 300);
      this.headLookY = -0.6;  // look down at food
      this.headX = 4;          // stretch toward food
    } else if (this.stateTime < 4000) {
      this.mouthOpenness = damp(this.mouthOpenness, 0.3 + Math.sin(this.stateTime * 0.04) * 0.1, 8, dt / 1000);
      this.bodyCompress = 0.02 + Math.sin(this.stateTime * 0.03) * 0.01;
      this.blushAlpha = damp(this.blushAlpha, 0.2, 2, dt / 1000);
      if (this.stateTime > 1000 && this.stateTime < 1100) this.spawnParticles(3, 'sparkle');
    } else if (this.stateTime < 5000) {
      this.foodAlpha = damp(this.foodAlpha, 0, 3, dt / 1000);
      this.mouthOpenness = damp(this.mouthOpenness, 0, 5, dt / 1000);
      this.blushAlpha = damp(this.blushAlpha, 0.3, 2, dt / 1000);
    } else {
      this.foodAlpha = 0;
      this.mouthOpenness = 0;
      this.headLookY = 0;
      this.blushAlpha = damp(this.blushAlpha, 0.15, 2, dt / 1000);
      this.setAnimation('happy');
      this.setEmotion('grateful');
      this.addFriendship(3);
    }
  }

  // ── Petting ──
  private updatePetting(dt: number): void {
    this.petTimer += dt;

    if (this.stateTime < 500) {
      // notices the hand
      this.petHandAlpha = this.stateTime / 500;
      this.stalkLenL = damp(this.stalkLenL, 1.15, 4, dt / 1000);
      this.stalkLenR = damp(this.stalkLenR, 1.1, 4, dt / 1000);
      this.headLookY = 0.5; // look at hand
    } else if (this.stateTime < 2200) {
      // leans into the touch
      this.bodyCompress = 0.03;
      this.blushAlpha = damp(this.blushAlpha, 0.45, 3, dt / 1000);
      this.bodySquash = damp(this.bodySquash, 0.94, 4, dt / 1000);
      this.stalkLenL = damp(this.stalkLenL, 0.9, 4, dt / 1000);
      this.stalkLenR = damp(this.stalkLenR, 0.9, 4, dt / 1000);
      this.eyeCloseL = damp(this.eyeCloseL, 0.6, 4, dt / 1000);
      this.eyeCloseR = damp(this.eyeCloseR, 0.6, 4, dt / 1000);

      if (this.petTimer > 320) {
        this.petTimer = 0;
        this.petPhase++;
        if (this.petPhase === 1) this.spawnParticles(4, 'sparkle');
        else if (this.petPhase === 2) this.spawnParticles(3, 'burst');
        else if (this.petPhase === 3) this.spawnHearts(3);
        if (this.petPhase > 3) this.petPhase = 1; // repeated pets keep reacting
      }
    } else if (this.stateTime < 2800) {
      this.petHandAlpha = damp(this.petHandAlpha, 0, 6, dt / 1000);
      this.blushAlpha = damp(this.blushAlpha, 0.2, 2, dt / 1000);
    } else {
      this.petHandAlpha = 0;
      this.blushAlpha = damp(this.blushAlpha, 0, 2, dt / 1000);
      this.eyeCloseL = damp(this.eyeCloseL, 0, 4, dt / 1000);
      this.eyeCloseR = damp(this.eyeCloseR, 0, 4, dt / 1000);
      this.setAnimation('happy');
      this.setEmotion('grateful');
      this.addFriendship(2);
    }

    this.mouthScale = 1.2;
    this.bodyCompress = damp(this.bodyCompress, 0.03, 4, dt / 1000);
  }

  private mouthScale = 1;

  // ═══════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════

  private updateTrail(dt: number): void {
    if (this.currentState === 'walking') {
      if (this.totalTime % 120 < dt) {
        this.trailPoints.push({
          x: this.position.x - (this.direction === 'left' ? -14 : 14),
          y: this.position.y + 16,
          alpha: SLIME_ALPHA,
          width: 5 + Math.random() * 4,
        });
        if (this.trailPoints.length > MAX_TRAIL_LENGTH) this.trailPoints.shift();
      }
    } else if (this.trailPoints.length > 0) {
      this.trailPoints.splice(0, 1);
    }
  }

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

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

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

    // slime trail (world space)
    this.drawTrail(ctx);

    ctx.save();
    ctx.translate(this.position.x, this.position.y + this.bodyBaseY);

    // turn flip: scale.x passes through 0 (side view) then reverses
    let flip = this.direction === 'left' ? -1 : 1;
    if (this.direction === 'up' || this.direction === 'down') flip = this.turnTo;
    if (this.turning) {
      const e = this.easeInOut(clamp(this.turnProgress, 0, 1));
      flip = this.turnFrom * (1 - e) + this.turnTo * e;
    }

    ctx.scale(flip * this.bodySquash, this.bodyStretch);

    this.drawShadow(ctx);
    this.drawBody(ctx);
    this.drawShellBody(ctx);
    this.drawHeadAssembly(ctx);

    ctx.restore();

    this.drawParticles(ctx);
    this.drawZZZ(ctx);
    this.drawFood(ctx);
    this.drawPetHand(ctx);
  }

  // ── Body path drawing ──

  private getSegmentPoints(): Array<{ x: number; y: number; w: number }> {
    return SEGMENTS.map((seg, i) => {
      // muscular wave travels tail→head
      const waveT = Math.sin(this.crawlPhase - (SEGMENTS.length - 1 - i) * 0.65);
      const waveY = Math.sin(this.crawlPhase - (SEGMENTS.length - 1 - i) * 0.65 + 1.2);
      const taper = 0.35 + 0.65 * (i / (SEGMENTS.length - 1));
      const off = waveT * this.crawlAmp * taper;
      const bob = waveY * this.crawlAmp * 0.7 * taper;
      const w = seg.baseWidth * (1 + waveT * 0.22 * taper) * (this.bodyCompress * 0.2 + 1);
      return { x: seg.restX + off, y: bob, w };
    });
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const pts = this.getSegmentPoints();

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    const shadowY = 14;
    ctx.ellipse(0, shadowY, 42, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Foot (darker underbelly)
    ctx.fillStyle = hexColor(this.skinColorDark);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(0, 4, 42 * (1 + this.bodyCompress), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body outline through segment points
    this.traceBodyPath(ctx, pts, this.skinColor, 1);

    // Body highlight (top)
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.ellipse(6, -8, 30, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.ellipse(16, -11, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private traceBodyPath(
    ctx: CanvasRenderingContext2D,
    pts: Array<{ x: number; y: number; w: number }>,
    fill: number,
    alpha: number,
  ): void {
    ctx.fillStyle = hexColor(fill);
    ctx.globalAlpha = alpha;
    ctx.beginPath();

    const n = pts.length;
    // top edge tail→head
    ctx.moveTo(pts[0].x - pts[0].w * 0.5, pts[0].y);
    for (let i = 1; i < n; i++) {
      const midX = (pts[i - 1].x + pts[i].x) / 2;
      const midY = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y - pts[i - 1].w * 0.5, midX, midY - pts[i].w * 0.4);
    }
    // head cap (front)
    const head = pts[n - 1];
    ctx.quadraticCurveTo(head.x, head.y - head.w * 1.4, head.x + head.w * 0.5, head.y);
    ctx.quadraticCurveTo(head.x, head.y + head.w * 1.4, head.x - head.w * 0.3, head.y);
    // bottom edge head→tail
    for (let i = n - 1; i > 0; i--) {
      const midX = (pts[i - 1].x + pts[i].x) / 2;
      const midY = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y + pts[i].w * 0.5, midX, midY + pts[i - 1].w * 0.4);
    }
    // tail cap
    ctx.quadraticCurveTo(pts[0].x, pts[0].y + pts[0].w * 0.8, pts[0].x - pts[0].w * 0.5, pts[0].y);

    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Shell ──

  private drawShellBody(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const r = 22 * s;

    const cx = this.shellPos.x;
    const cy = this.shellPos.y - 10;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.shellRot);

    // Shell base
    ctx.fillStyle = hexColor(this.shellColor);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner shading
    ctx.fillStyle = hexColor(this.shellColorDark);
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r * 0.75, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 1.15, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Spiral
    ctx.strokeStyle = hexColor(this.shellColorDark);
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    const maxR = r * 0.75;
    const turns = 3.5;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const rr = maxR * t;
      const angle = t * turns * Math.PI * 2;
      const x = Math.cos(angle) * rr;
      const y = Math.sin(angle) * rr * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.35, r * 0.3, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Head assembly ──

  private drawHeadAssembly(ctx: CanvasRenderingContext2D): void {
    const s = DEFAULT_SCALE;
    const headX = HEAD_X + this.headX;
    const headY = this.headY;

    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(this.headRot);

    // Antennae (behind)
    ctx.strokeStyle = hexColor(this.skinColorDark);
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.4 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.quadraticCurveTo(-8, -18 - this.stalkLenL * 6, -4, -26 - this.stalkLenL * 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -5);
    ctx.quadraticCurveTo(10, -20 - this.stalkLenR * 6, 6, -28 - this.stalkLenR * 6);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Head base (blob)
    ctx.fillStyle = hexColor(this.skinColor);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 * s, 7.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.ellipse(-2, -2.5, 5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye stalks
    this.drawEyeStalk(ctx, -3, -5, this.stalkLenL, this.stalkSwayL);
    this.drawEyeStalk(ctx, 3, -5, this.stalkLenR, this.stalkSwayR);

    // Eyes
    const eyeR = 6.5 * s;
    const eLX = -3;
    const eRX = 3;
    const eLY = -5 - 14 * this.stalkLenL;
    const eRY = -5 - 14 * this.stalkLenR;

    this.drawEye(ctx, eLX, eLY, eyeR, this.eyeCloseL);
    this.drawEye(ctx, eRX, eRY, eyeR, this.eyeCloseR);

    // Blush
    if (this.blushAlpha > 0.01 || this.currentEmotion === 'happy' || this.currentEmotion === 'grateful') {
      ctx.fillStyle = hexColor(COLORS.blush);
      ctx.globalAlpha = Math.max(0.15, this.blushAlpha);
      ctx.beginPath();
      ctx.ellipse(-6, 3, 3 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, 3, 3 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Mouth
    this.drawMouth(ctx);

    ctx.restore();
  }

  private drawEyeStalk(ctx: CanvasRenderingContext2D, ox: number, oy: number, len: number, sway: number): void {
    const s = DEFAULT_SCALE;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(sway);
    ctx.strokeStyle = hexColor(this.skinColorLight);
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -14 * len);
    ctx.stroke();
    ctx.restore();
  }

  private drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, close: number): void {
    const s = DEFAULT_SCALE;
    const squash = 1 - close * 0.88;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash);

    // eye white
    ctx.fillStyle = hexColor(COLORS.eyeWhite);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // blue tint
    ctx.fillStyle = hexColor(COLORS.eyeBlue);
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // pupil (with blink squash)
    if (close < 0.85) {
      ctx.fillStyle = hexColor(COLORS.pupil);
      ctx.beginPath();
      ctx.arc(this.pupilX * 0.7, this.pupilY * 0.7, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();
      // pupil glint
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(this.pupilX * 0.7 + 1, this.pupilY * 0.7 - 1.2, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawMouth(ctx: CanvasRenderingContext2D): void {
    if (this.currentState === 'sleeping') return;
    const s = DEFAULT_SCALE;

    ctx.save();
    ctx.strokeStyle = hexColor(this.skinColorDark);
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1.6 * s;
    ctx.lineCap = 'round';

    const my = 4;

    switch (this.currentEmotion) {
      case 'happy': case 'excited': case 'celebrating': case 'grateful':
        ctx.beginPath();
        ctx.arc(1, my + 1, 3.5 * s, 0.2, Math.PI - 0.2);
        ctx.stroke();
        break;
      case 'confused':
        ctx.beginPath();
        ctx.moveTo(-2.5 * s, my);
        ctx.lineTo(-0.5 * s, my + 1.5 * s);
        ctx.lineTo(1.5 * s, my);
        ctx.stroke();
        break;
      case 'thinking': case 'working':
        ctx.beginPath();
        ctx.moveTo(-3 * s, my + 1 * s);
        ctx.lineTo(3 * s, my + 1 * s);
        ctx.stroke();
        break;
      case 'surprised':
        ctx.fillStyle = hexColor(COLORS.pupil);
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(0, my + 1 * s, 2.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'sleepy':
        ctx.beginPath();
        ctx.arc(1, my, 2 * s, 0.3, Math.PI - 0.3);
        ctx.stroke();
        break;
      case 'curious':
        ctx.beginPath();
        ctx.moveTo(-2 * s, my + 1 * s);
        ctx.quadraticCurveTo(0, my - 1 * s, 2 * s, my + 1 * s);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(1, my, 2.5 * s, 0.2, Math.PI - 0.2);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  private drawShadow(ctx: CanvasRenderingContext2D): void {
    const pts = this.getSegmentPoints();
    const minX = Math.min(...pts.map(p => p.x));
    const maxX = Math.max(...pts.map(p => p.x));
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse((minX + maxX) / 2, 13, (maxX - minX) / 2 + 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Trail / particles / zzz / food / pet hand ──

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trailPoints.length < 2) return;
    ctx.save();
    for (let i = 1; i < this.trailPoints.length; i++) {
      const p0 = this.trailPoints[i - 1];
      const p1 = this.trailPoints[i];
      const age = i / this.trailPoints.length;
      if (p0.alpha * age < 0.01) continue;
      ctx.strokeStyle = hexColor(this.shellColorLight);
      ctx.globalAlpha = p0.alpha * age;
      ctx.lineWidth = p0.width * age;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = hexColor(p.color);
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
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? r : r * 0.45;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
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
    const fx = HEAD_X + this.headX + 12;
    const fy = this.headY + 8;

    ctx.save();
    ctx.globalAlpha = this.foodAlpha;
    ctx.translate(fx, fy);
    ctx.scale(this.foodScale, this.foodScale);
    ctx.fillStyle = hexColor(COLORS.accent);
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexColor(COLORS.accentDark);
    ctx.globalAlpha = 0.5 * this.foodAlpha;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPetHand(ctx: CanvasRenderingContext2D): void {
    if (this.petHandAlpha <= 0) return;
    const s = DEFAULT_SCALE;
    const hx = HEAD_X + this.headX + 6;
    const hy = this.headY - 14 + Math.sin(this.stateTime * 0.005) * 3;

    ctx.save();
    ctx.globalAlpha = this.petHandAlpha;
    ctx.fillStyle = hexColor(COLORS.hand);
    ctx.beginPath();
    ctx.arc(hx, hy, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexColor(COLORS.handShadow);
    ctx.globalAlpha = 0.5 * this.petHandAlpha;
    ctx.beginPath();
    ctx.arc(hx + 1, hy + 1, 4 * s, 0, Math.PI * 2);
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

  // ═══════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════

  public spawnAnimation(): void {
    this.currentState = 'spawning';
    this.stateTime = 0;
    this.position = { x: this.width / 2, y: this.height * 0.7 };
    this.spawnParticles(30, 'sparkle');

    const startTime = this.totalTime;
    const duration = 1000;

    this.animationOverride = (ctx, time) => {
      const t = Math.min((time - startTime) / duration, 1);
      const e = this.easeOutBack(t);

      ctx.clearRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.globalAlpha = e;
      ctx.scale(0.1 + e * 0.9, 0.1 + e * 0.9);
      ctx.fillStyle = hexColor(this.skinColor);
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexColor(this.shellColor);
      ctx.beginPath();
      ctx.ellipse(-14, -18, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.drawParticles(ctx);

      if (t >= 1) {
        ctx.clearRect(0, 0, this.width, this.height);
        this.setAnimation('idle');
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
      const t = Math.min((time - startTime) / duration, 1);
      const e = Math.pow(t, 3);

      ctx.clearRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.globalAlpha = 1 - e;
      ctx.scale(1 - e * 0.6, 1 - e * 0.6);
      this.drawBody(ctx);
      this.drawShellBody(ctx);
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

  public setAnimation(state: AnimationState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateTime = 0;

    switch (state) {
      case 'sleeping':
        this.eyeCloseL = 1;
        this.eyeCloseR = 1;
        this.sleepZZTimer = 0;
        break;
      case 'walking':
        this.movePhase = 'prepare';
        this.moveTimer = 0;
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
        this.leanForward = damp(this.leanForward, 0, 4, 0.01);
        break;
    }
  }

  public setEmotion(emotion: EmotionalState): void {
    if (emotion === this.currentEmotion) return;
    this.currentEmotion = emotion;

    if (emotion === 'surprised') {
      this.stalkBounceVL += 0.8;
      this.stalkBounceVR += 0.8;
    }
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

  public waveAnimation(): void {
    this.setAnimation('waving');
    this.spawnParticles(6, 'sparkle');
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
    if (Math.abs(dx) > 12) this.direction = dx >= 0 ? 'right' : 'left';
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.mouseOver = true;
    this.lastInteractPos = { x: mouseX, y: mouseY };
  }

  public setMouseOver(over: boolean): void {
    this.mouseOver = over;
    if (!over) this.lastInteractPos = null;
  }

  public teleportTo(x: number, y: number): void {
    this.position = { x: clamp(x, 0, this.width), y: clamp(y, 0, this.height) };
    this.velocity = { x: 0, y: 0 };
    this.crawlAmp = 0;
  }

  public setDragging(dragging: boolean): void {
    this.isDragging = dragging;
  }

  public getPosition(): Position { return { ...this.position }; }
  public getState(): AnimationState { return this.currentState; }
  public getDirection(): Direction { return this.direction; }
  public getFriendship(): number { return this.friendship; }

  public addFriendship(amount: number): void {
    this.friendship = clamp(this.friendship + amount, 0, 100);
  }

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

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}