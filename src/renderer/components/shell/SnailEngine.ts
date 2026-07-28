import * as PIXI from 'pixi.js';
import type { Position, Direction, Edge, AnimationState, EmotionalState } from '../../../shared/types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'star';
}

const LERP_SPEED = 0.08;
const BREATHE_SPEED = 0.03;
const BLINK_INTERVAL_MIN = 2500;
const BLINK_INTERVAL_MAX = 6000;
const BLINK_DURATION = 150;
const IDLE_LOOK_INTERVAL = 4000;
const EYE_STALK_WIGGLE_SPEED = 0.04;
const SHELL_INERTIA = 0.06;
const DEFAULT_SCALE = 0.85;

export class SnailEngine {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private bodyContainer: PIXI.Container;
  private shellGroup: PIXI.Container;
  private shell: PIXI.Graphics;
  private body: PIXI.Graphics;
  private eyeStalkLeft: PIXI.Graphics;
  private eyeStalkRight: PIXI.Graphics;
  private eyeLeft: PIXI.Graphics;
  private eyeRight: PIXI.Graphics;
  private pupilLeft: PIXI.Graphics;
  private pupilRight: PIXI.Graphics;
  private mouth: PIXI.Graphics;
  private feelerLeft: PIXI.Graphics;
  private feelerRight: PIXI.Graphics;
  private trail: PIXI.Graphics;
  private particles: Particle[] = [];
  private zzzContainer: PIXI.Container;
  private emotionIndicator: PIXI.Container;
  private shadow: PIXI.Graphics;

  private currentState: AnimationState = 'idle';
  private currentEmotion: EmotionalState = 'happy';
  private direction: Direction = 'right';
  private edge: Edge = 'bottom';

  private position: Position = { x: 200, y: 150 };
  private prevPosition: Position = { x: 200, y: 150 };

  private moveStartPos: Position = { x: 200, y: 150 };
  private moveEndPos: Position = { x: 200, y: 150 };
  private moveProgress = 0;
  private moveDuration = 0;

  private stateTime = 0;
  private totalTime = 0;
  private blinkTimer = 0;
  private blinkProgress = 0;
  private idleLookTimer = 0;
  private idleSubState: 'breathing' | 'looking' | 'stretching' | 'bouncing' = 'breathing';
  private idleSubTimer = 0;

  private bodyY = 0;
  private bodySway = 0;
  private bodyScaleX = 1;
  private bodyScaleY = 1;
  private shellLagX = 0;
  private shellLagY = 0;
  private shellRotate = 0;
  private eyeScaleY = 1;
  private pupilOffX = 0;
  private pupilOffY = 0;
  private feelerSwayL = 0;
  private feelerSwayR = 0;
  private blushAlpha = 0;
  private mouthScale = 1;

  private skinColor = 0x4ade80;
  private shellColor = 0x86efac;
  private shellDarkColor = 0x22c55e;

  private mouseOver = false;
  private mouseX = 0;
  private mouseY = 0;

  private trailPoints: Position[] = [];
  private walkingStep = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.app = new PIXI.Application();
    this.container = new PIXI.Container();
    this.bodyContainer = new PIXI.Container();
    this.shellGroup = new PIXI.Container();
    this.shell = new PIXI.Graphics();
    this.body = new PIXI.Graphics();
    this.eyeStalkLeft = new PIXI.Graphics();
    this.eyeStalkRight = new PIXI.Graphics();
    this.eyeLeft = new PIXI.Graphics();
    this.eyeRight = new PIXI.Graphics();
    this.pupilLeft = new PIXI.Graphics();
    this.pupilRight = new PIXI.Graphics();
    this.mouth = new PIXI.Graphics();
    this.feelerLeft = new PIXI.Graphics();
    this.feelerRight = new PIXI.Graphics();
    this.trail = new PIXI.Graphics();
    this.zzzContainer = new PIXI.Container();
    this.emotionIndicator = new PIXI.Container();
    this.shadow = new PIXI.Graphics();

    this.moveStartPos = { x: width / 2, y: height / 2 };
    this.moveEndPos = { x: width / 2, y: height / 2 };
    this.position = { x: width / 2, y: height / 2 };
    this.prevPosition = { x: width / 2, y: height / 2 };

    this.init(canvas, width, height);
  }

  async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    await this.app.init({
      canvas,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.container.sortableChildren = true;

    this.trail.zIndex = 0;
    this.shadow.zIndex = 2;
    this.bodyContainer.zIndex = 10;
    this.zzzContainer.zIndex = 20;
    this.emotionIndicator.zIndex = 15;

    this.shellGroup.addChild(this.shell);
    this.bodyContainer.addChild(this.shadow);
    this.bodyContainer.addChild(this.shellGroup);
    this.bodyContainer.addChild(this.body);
    this.bodyContainer.addChild(this.feelerLeft);
    this.bodyContainer.addChild(this.feelerRight);
    this.bodyContainer.addChild(this.eyeStalkLeft);
    this.bodyContainer.addChild(this.eyeStalkRight);
    this.bodyContainer.addChild(this.eyeLeft);
    this.bodyContainer.addChild(this.eyeRight);
    this.bodyContainer.addChild(this.pupilLeft);
    this.bodyContainer.addChild(this.pupilRight);
    this.bodyContainer.addChild(this.mouth);

    this.container.addChild(this.trail);
    this.container.addChild(this.bodyContainer);
    this.container.addChild(this.zzzContainer);
    this.container.addChild(this.emotionIndicator);

    this.app.stage.addChild(this.container);
    this.app.ticker.add(() => this.update());
    this.drawSnail();
  }

  private lerp(current: number, target: number, speed: number): number {
    return current + (target - current) * speed;
  }

  private rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  // ── DRAWING ──────────────────────────────────────

  private drawSnail(): void {
    const s = DEFAULT_SCALE;

    this.shadow.clear();
    this.shadow.beginFill(0x000000, 0.08);
    this.shadow.ellipse(0, 18 * s, 30 * s, 6 * s);
    this.shadow.endFill();

    this.body.clear();
    this.body.beginFill(this.skinColor, 1);
    this.body.ellipse(0, 14 * s, 34 * s, 11 * s);
    this.body.endFill();

    this.body.beginFill(this.skinColor, 0.5);
    this.body.ellipse(5 * s, 12 * s, 22 * s, 6 * s);
    this.body.endFill();

    this.shell.clear();
    this.shell.beginFill(this.shellColor, 1);
    this.shell.circle(-3 * s, -12 * s, 26 * s);
    this.shell.endFill();

    this.shell.beginFill(this.shellDarkColor, 0.12);
    this.shell.circle(-3 * s, -16 * s, 18 * s);
    this.shell.endFill();

    this.shell.lineStyle(1.8 * s, this.shellDarkColor, 0.45);
    this.shell.arc(-3 * s, -12 * s, 10 * s, 0, Math.PI * 2);
    this.shell.arc(-3 * s, -12 * s, 17 * s, 0.3, Math.PI * 1.4);
    this.shell.arc(1 * s, -8 * s, 5 * s, 0, Math.PI * 1.6);

    this.shell.lineStyle(0);
    this.shell.beginFill(this.shellDarkColor, 0.25);
    this.shell.moveTo(-3 * s, -38 * s);
    this.shell.quadraticCurveTo(-8 * s, -34 * s, -6 * s, -28 * s);
    this.shell.quadraticCurveTo(-3 * s, -30 * s, 0 * s, -28 * s);
    this.shell.quadraticCurveTo(2 * s, -34 * s, -3 * s, -38 * s);
    this.shell.endFill();

    this.shell.beginFill(0xffffff, 0.08);
    this.shell.circle(-10 * s, -22 * s, 6 * s);
    this.shell.endFill();

    const eyeY = -32 * s;
    const eyeLX = 10 * s;
    const eyeRX = 24 * s;

    this.eyeStalkLeft.clear();
    this.eyeStalkLeft.lineStyle(2.2 * s, this.skinColor, 1);
    this.eyeStalkLeft.moveTo(5 * s, -5 * s);
    this.eyeStalkLeft.lineTo(eyeLX, eyeY);

    this.eyeStalkRight.clear();
    this.eyeStalkRight.lineStyle(2.2 * s, this.skinColor, 1);
    this.eyeStalkRight.moveTo(17 * s, -5 * s);
    this.eyeStalkRight.lineTo(eyeRX, eyeY);

    this.eyeLeft.clear();
    this.eyeLeft.beginFill(0xffffff, 1);
    this.eyeLeft.circle(eyeLX, eyeY, 7 * s);
    this.eyeLeft.endFill();
    this.eyeLeft.beginFill(0xf0f0ff, 0.3);
    this.eyeLeft.circle(eyeLX - 1 * s, eyeY - 1 * s, 4 * s);
    this.eyeLeft.endFill();

    this.eyeRight.clear();
    this.eyeRight.beginFill(0xffffff, 1);
    this.eyeRight.circle(eyeRX, eyeY, 7 * s);
    this.eyeRight.endFill();
    this.eyeRight.beginFill(0xf0f0ff, 0.3);
    this.eyeRight.circle(eyeRX - 1 * s, eyeY - 1 * s, 4 * s);
    this.eyeRight.endFill();

    this.pupilLeft.clear();
    this.pupilLeft.beginFill(0x1a1a2e, 1);
    this.pupilLeft.circle(eyeLX + 2 * s, eyeY, 3.5 * s);
    this.pupilLeft.endFill();
    this.pupilLeft.beginFill(0xffffff, 0.6);
    this.pupilLeft.circle(eyeLX + 3 * s, eyeY - 1 * s, 1.2 * s);
    this.pupilLeft.endFill();

    this.pupilRight.clear();
    this.pupilRight.beginFill(0x1a1a2e, 1);
    this.pupilRight.circle(eyeRX + 2 * s, eyeY, 3.5 * s);
    this.pupilRight.endFill();
    this.pupilRight.beginFill(0xffffff, 0.6);
    this.pupilRight.circle(eyeRX + 3 * s, eyeY - 1 * s, 1.2 * s);
    this.pupilRight.endFill();

    this.feelerLeft.clear();
    this.feelerLeft.lineStyle(1.8 * s, this.skinColor, 0.8);
    this.feelerLeft.moveTo(8 * s, -8 * s);
    this.feelerLeft.bezierCurveTo(6 * s, -26 * s, -8 * s, -32 * s, -6 * s, -24 * s);

    this.feelerRight.clear();
    this.feelerRight.lineStyle(1.8 * s, this.skinColor, 0.8);
    this.feelerRight.moveTo(14 * s, -8 * s);
    this.feelerRight.bezierCurveTo(16 * s, -26 * s, 28 * s, -32 * s, 26 * s, -24 * s);

    this.drawMouth();
  }

  private drawMouth(): void {
    const s = DEFAULT_SCALE;
    this.mouth.clear();

    if (this.currentState === 'sleeping') {
      return;
    }

    this.mouth.lineStyle(1.8 * s, 0x166534, 0.7);

    const mx = 12 * s;
    const my = 6 * s;

    switch (this.currentEmotion) {
      case 'happy':
      case 'excited':
      case 'celebrating':
      case 'grateful':
        this.mouth.arc(mx, my, 5 * s, 0.15, Math.PI - 0.15);
        break;
      case 'confused':
      case 'thinking':
      case 'working':
        this.mouth.moveTo(mx - 5 * s, my + 2 * s);
        this.mouth.lineTo(mx + 5 * s, my + 2 * s);
        break;
      case 'surprised':
        this.mouth.beginFill(0x1a1a2e, 0.3);
        this.mouth.ellipse(mx, my, 4 * s, 5 * s);
        this.mouth.endFill();
        break;
      case 'sleepy':
        this.mouth.arc(mx, my, 3 * s, 0.15, Math.PI - 0.15);
        break;
      default:
        this.mouth.arc(mx, my, 3.5 * s, 0.15, Math.PI - 0.15);
        break;
    }
  }

  // ── MAIN UPDATE LOOP ────────────────────────────

  private update(): void {
    const dt = this.app.ticker.deltaMS;
    this.totalTime += dt;
    this.stateTime += dt;

    this.updateBlink(dt);
    this.updateIdleSubBehaviors(dt);
    this.applyBreathing(dt);
    this.applySway(dt);
    this.applyEyeStalkWiggle(dt);
    this.applyShellInertia(dt);
    this.applyMouthAnimation(dt);

    switch (this.currentState) {
      case 'walking':
        this.updateWalking(dt);
        break;
      case 'sleeping':
        this.updateSleeping(dt);
        break;
      case 'spawning':
        this.updateSpawnFade(dt);
        break;
      case 'hiding':
        this.updateHideOut(dt);
        break;
      case 'dancing':
      case 'celebrating':
        this.updateCelebration(dt);
        break;
    }

    this.prevPosition = { ...this.position };
    this.updateTrail(dt);
    this.updateParticles(dt);
    this.updateZZZ(dt);
    this.updateEmotionIndicator();
    this.render();
  }

  // ── STATE UPDATES ────────────────────────────────

  private applyBreathing(dt: number): void {
    let speed = BREATHE_SPEED;
    let amplitude = 2.5;

    switch (this.currentState) {
      case 'sleeping':
        speed = 0.015;
        amplitude = 3.5;
        break;
      case 'walking':
        speed = 0.06;
        amplitude = 4;
        break;
      case 'dancing':
      case 'celebrating':
        speed = 0.12;
        amplitude = 6;
        break;
      case 'thinking':
        speed = 0.02;
        amplitude = 1.5;
        break;
    }

    if (this.currentState === 'walking') {
      const stepCycle = Math.sin(this.totalTime * speed * 2);
      const targetScaleX = 1 + stepCycle * 0.06;
      const targetScaleY = 1 - stepCycle * 0.04;
      this.bodyScaleX = this.lerp(this.bodyScaleX, targetScaleX, 0.15);
      this.bodyScaleY = this.lerp(this.bodyScaleY, targetScaleY, 0.15);
    } else {
      const breatheVal = Math.sin(this.totalTime * speed) * amplitude;
      const targetScaleX = 1 + breatheVal * 0.008;
      const targetScaleY = 1 + breatheVal * 0.006;
      this.bodyScaleX = this.lerp(this.bodyScaleX, targetScaleX, 0.06);
      this.bodyScaleY = this.lerp(this.bodyScaleY, targetScaleY, 0.06);
    }

    const breatheY = Math.sin(this.totalTime * speed) * amplitude;
    this.bodyY = this.lerp(this.bodyY, breatheY, 0.1);
  }

  private applySway(dt: number): void {
    let target = 0;

    if (this.currentState === 'idle') {
      target = Math.sin(this.totalTime * 0.012 + 1) * 2;
    } else if (this.currentState === 'walking') {
      target = Math.sin(this.totalTime * 0.08) * 1.5;
    } else if (this.currentState === 'dancing' || this.currentState === 'celebrating') {
      target = Math.sin(this.totalTime * 0.06) * 5;
    } else if (this.currentState === 'sleeping') {
      target = Math.sin(this.totalTime * 0.008) * 1;
    }

    this.bodySway = this.lerp(this.bodySway, target, 0.08);
  }

  private applyEyeStalkWiggle(dt: number): void {
    if (this.currentState === 'sleeping') {
      this.feelerSwayL = this.lerp(this.feelerSwayL, 0, 0.05);
      this.feelerSwayR = this.lerp(this.feelerSwayR, 0, 0.05);
      return;
    }

    const speed = EYE_STALK_WIGGLE_SPEED;
    let amplitude = 0.08;

    if (this.currentEmotion === 'curious' || this.currentEmotion === 'excited') {
      amplitude = 0.14;
    } else if (this.currentEmotion === 'sleepy') {
      amplitude = 0.03;
    }

    const targetL = Math.sin(this.totalTime * speed * 1.1) * amplitude;
    const targetR = Math.sin(this.totalTime * speed * 0.9 + 0.8) * amplitude;

    this.feelerSwayL = this.lerp(this.feelerSwayL, targetL, 0.1);
    this.feelerSwayR = this.lerp(this.feelerSwayR, targetR, 0.1);
  }

  private applyShellInertia(dt: number): void {
    if (this.currentState === 'walking') {
      const dx = this.position.x - this.prevPosition.x;
      const dy = this.position.y - this.prevPosition.y;
      this.shellLagX = this.lerp(this.shellLagX, -dx * 0.6, SHELL_INERTIA);
      this.shellLagY = this.lerp(this.shellLagY, -dy * 0.4, SHELL_INERTIA);
    } else {
      this.shellLagX = this.lerp(this.shellLagX, 0, 0.08);
      this.shellLagY = this.lerp(this.shellLagY, 0, 0.08);
    }

    if (this.currentState === 'walking') {
      this.shellRotate = this.lerp(this.shellRotate, this.bodySway * 0.3, 0.1);
    } else if (this.currentState === 'dancing' || this.currentState === 'celebrating') {
      this.shellRotate = this.lerp(this.shellRotate, this.bodySway * 0.5, 0.15);
    } else {
      this.shellRotate = this.lerp(this.shellRotate, 0, 0.05);
    }
  }

  private applyMouthAnimation(dt: number): void {
    if (this.currentState === 'sleeping') {
      this.mouthScale = this.lerp(this.mouthScale, 0, 0.1);
    } else {
      this.mouthScale = this.lerp(this.mouthScale, 1, 0.1);
    }
  }

  private updateBlink(dt: number): void {
    if (this.currentState === 'sleeping') {
      this.eyeScaleY = this.lerp(this.eyeScaleY, 0.05, 0.15);
      return;
    }

    this.blinkTimer += dt;

    const minInterval = this.mouseOver ? BLINK_INTERVAL_MIN * 0.5 : BLINK_INTERVAL_MIN;
    const maxInterval = this.mouseOver ? BLINK_INTERVAL_MAX * 0.4 : BLINK_INTERVAL_MAX;

    if (this.blinkTimer > this.rand(minInterval, maxInterval)) {
      this.blinkTimer = 0;
      this.blinkProgress = 0;
    }

    if (this.blinkProgress < BLINK_DURATION) {
      this.blinkProgress += dt;
      const t = this.blinkProgress / BLINK_DURATION;
      if (t < 0.15) {
        this.eyeScaleY = this.lerp(this.eyeScaleY, 0.05, 0.5);
      } else if (t < 0.3) {
        this.eyeScaleY = this.lerp(this.eyeScaleY, 1, 0.3);
      } else {
        this.eyeScaleY = this.lerp(this.eyeScaleY, 1, 0.08);
      }
    }
  }

  private updateIdleSubBehaviors(dt: number): void {
    if (this.currentState !== 'idle' && this.currentState !== 'happy') return;
    this.idleSubTimer += dt;

    if (this.idleSubTimer > IDLE_LOOK_INTERVAL && this.idleSubState === 'breathing') {
      this.idleSubTimer = 0;
      if (Math.random() < 0.4) {
        this.idleSubState = 'looking';
      } else if (Math.random() < 0.5) {
        this.idleSubState = 'bouncing';
      } else {
        this.idleSubState = 'stretching';
      }
    }

    if (this.idleSubState === 'looking') {
      const lookX = Math.sin(this.stateTime * 0.003) * 3;
      const lookY = Math.cos(this.stateTime * 0.005) * 2 - 1.5;
      this.pupilOffX = this.lerp(this.pupilOffX, lookX, 0.04);
      this.pupilOffY = this.lerp(this.pupilOffY, lookY, 0.04);
      if (this.idleSubTimer > 2500) {
        this.idleSubTimer = 0;
        this.idleSubState = 'breathing';
      }
    } else if (this.idleSubState === 'bouncing') {
      this.pupilOffX = this.lerp(this.pupilOffX, 0, 0.06);
      this.pupilOffY = this.lerp(this.pupilOffY, 0, 0.06);
      if (this.idleSubTimer > 1800) {
        this.idleSubTimer = 0;
        this.idleSubState = 'breathing';
      }
    } else if (this.idleSubState === 'stretching') {
      this.pupilOffX = this.lerp(this.pupilOffX, 0, 0.06);
      this.pupilOffY = this.lerp(this.pupilOffY, -4, 0.06);
      if (this.idleSubTimer > 2000) {
        this.idleSubTimer = 0;
        this.idleSubState = 'breathing';
      }
    } else {
      this.pupilOffX = this.lerp(this.pupilOffX, 0, 0.04);
      this.pupilOffY = this.lerp(this.pupilOffY, 0, 0.04);
    }
  }

  private updateWalking(dt: number): void {
    this.moveProgress += dt / this.moveDuration;
    if (this.moveProgress >= 1) {
      this.moveProgress = 0;
      this.position = { ...this.moveEndPos };
      this.setAnimation('idle');
      return;
    }

    const t = this.easeInOutCubic(this.moveProgress);
    this.position.x = this.moveStartPos.x + (this.moveEndPos.x - this.moveStartPos.x) * t;
    this.position.y = this.moveStartPos.y + (this.moveEndPos.y - this.moveStartPos.y) * t;

    this.walkingStep += dt * 0.008;
  }

  private updateSleeping(dt: number): void {
    if (this.stateTime % 2000 < dt) {
      this.addZZZ();
    }
  }

  private updateSpawnFade(dt: number): void {
    if (this.stateTime > 1000) {
      this.setAnimation('idle');
    }
  }

  private updateHideOut(dt: number): void {
    if (this.stateTime > 600) {
      this.bodyContainer.alpha = 0;
      this.bodyContainer.scale.set(0.3);
    }
  }

  private updateCelebration(dt: number): void {
    if (this.stateTime > 2500) {
      this.setAnimation('idle');
      this.setEmotion('happy');
    }
  }

  // ── TRAIL ────────────────────────────────────────

  private updateTrail(dt: number): void {
    if (this.currentState !== 'walking') {
      if (this.trailPoints.length > 0) {
        this.trailPoints.splice(0, Math.min(3, this.trailPoints.length));
      }
      if (this.trailPoints.length === 0) {
        this.trail.clear();
        return;
      }
    }

    if (this.currentState === 'walking' && this.totalTime % 80 < dt) {
      this.trailPoints.push({ ...this.position });
      if (this.trailPoints.length > 24) {
        this.trailPoints.shift();
      }
    }

    this.trail.clear();
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      const alpha = (i / this.trailPoints.length) * 0.18;
      const width = 4 * (i / this.trailPoints.length);
      this.trail.lineStyle(width, this.skinColor, alpha);
      const yOff = 14 * DEFAULT_SCALE;
      this.trail.moveTo(this.trailPoints[i].x, this.trailPoints[i].y + yOff);
      this.trail.lineTo(this.trailPoints[i + 1].x, this.trailPoints[i + 1].y + yOff);
    }
  }

  // ── PARTICLES ────────────────────────────────────

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      p.alpha = p.life / p.maxLife;
      p.rotation += p.rotationSpeed;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.renderParticles();
    }
  }

  private renderParticles(): void {
    const g = new PIXI.Graphics();
    g.zIndex = 5;
    this.container.addChild(g);

    for (const p of this.particles) {
      g.beginFill(p.color, p.alpha);
      if (p.shape === 'star') {
        this.drawStar(g, p.x, p.y, p.size, p.rotation);
      } else {
        g.drawCircle(p.x, p.y, p.size);
      }
      g.endFill();
    }

    setTimeout(() => {
      this.container.removeChild(g);
      g.destroy();
    }, 100);
  }

  private drawStar(g: PIXI.Graphics, cx: number, cy: number, r: number, rot: number): void {
    const points = 5;
    const innerR = r * 0.45;
    g.moveTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? innerR : r;
      const angle = rot + (i * Math.PI) / points;
      g.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    g.closePath();
  }

  private spawnParticles(count: number, type: 'burst' | 'confetti' | 'sparkle' = 'burst'): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'confetti' ? 1.5 + Math.random() * 3 : 0.5 + Math.random() * 2.5;
      this.particles.push({
        x: this.position.x,
        y: this.position.y - 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'confetti' ? 3 : 1.5),
        life: type === 'sparkle' ? 20 + Math.random() * 20 : 40 + Math.random() * 50,
        maxLife: 70,
        size: type === 'sparkle' ? 1.5 + Math.random() * 2 : 2.5 + Math.random() * 4,
        color: this.getParticleColor(),
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        shape: type === 'sparkle' ? 'star' : (Math.random() < 0.3 ? 'star' : 'circle'),
      });
    }
  }

  private getParticleColor(): number {
    const skinPalette = [
      this.skinColor,
      lightenColor(this.skinColor, 40),
      this.shellColor,
      lightenColor(this.shellColor, 30),
      0xfbbf24,
      0x60a5fa,
      0xf472b6,
      0xa78bfa,
      0x34d399,
      0xffffff,
    ];
    return skinPalette[Math.floor(Math.random() * skinPalette.length)];
  }

  // ── ZZZ ──────────────────────────────────────────

  private updateZZZ(dt: number): void {
    const children = this.zzzContainer.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i] as PIXI.Text;
      child.y -= 0.4;
      child.alpha -= 0.004;
      child.x += Math.sin(this.totalTime * 0.01 + i) * 0.3;

      if (child.alpha <= 0) {
        this.zzzContainer.removeChild(child);
        child.destroy();
      }
    }
  }

  private addZZZ(): void {
    const z = new PIXI.Text({
      text: Math.random() < 0.3 ? 'Z' : 'z',
      style: new PIXI.TextStyle({
        fontSize: 14 + Math.random() * 10,
        fill: this.skinColor,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
      }),
    });
    z.x = 28 + Math.random() * 24;
    z.y = -35 + Math.random() * 12;
    z.alpha = 0.75;
    this.zzzContainer.addChild(z);
  }

  // ── EMOTION INDICATOR ────────────────────────────

  private updateEmotionIndicator(): void {
    this.emotionIndicator.children.forEach(c => c.destroy());
    this.emotionIndicator.removeChildren();

    let emoji = '';
    switch (this.currentEmotion) {
      case 'celebrating':
      case 'excited':
        emoji = '\u2728';
        break;
      case 'curious':
        emoji = '\u2753';
        break;
      case 'thinking':
      case 'working':
        emoji = '\uD83D\uDCA1';
        break;
      case 'confused':
        emoji = '\u2754';
        break;
      case 'sleepy':
        emoji = '\uD83D\uDCA4';
        break;
      case 'surprised':
        emoji = '\u2757';
        break;
      case 'grateful':
        emoji = '\u2764\uFE0F';
        break;
    }

    if (!emoji) return;

    const text = new PIXI.Text({
      text: emoji,
      style: new PIXI.TextStyle({ fontSize: 20, fontFamily: 'Arial' }),
    });
    text.x = 32;
    text.y = -45;
    text.alpha = 0.75;
    this.emotionIndicator.addChild(text);
  }

  // ── RENDER ───────────────────────────────────────

  private render(): void {
    this.bodyContainer.x = this.position.x;
    this.bodyContainer.y = this.position.y + this.bodyY;

    const flip = this.direction === 'left';
    this.bodyContainer.scale.x = (flip ? -1 : 1) * this.bodyScaleX;
    this.bodyContainer.scale.y = this.bodyScaleY;

    this.bodyContainer.rotation = this.bodySway * (Math.PI / 180);

    this.shellGroup.x = this.shellLagX;
    this.shellGroup.y = this.shellLagY;
    this.shellGroup.rotation = this.shellRotate * (Math.PI / 180);

    this.feelerLeft.rotation = this.feelerSwayL;
    this.feelerRight.rotation = this.feelerSwayR;

    this.pupilLeft.scale.set(1, this.eyeScaleY);
    this.pupilRight.scale.set(1, this.eyeScaleY);
    this.eyeLeft.scale.set(1, this.eyeScaleY);
    this.eyeRight.scale.set(1, this.eyeScaleY);

    this.pupilLeft.x = this.pupilOffX;
    this.pupilLeft.y = this.pupilOffY;
    this.pupilRight.x = this.pupilOffX;
    this.pupilRight.y = this.pupilOffY;

    this.mouth.alpha = Math.max(0, this.mouthScale);
  }

  // ── EASING ───────────────────────────────────────

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeOutElastic(t: number): number {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  // ── PUBLIC API ───────────────────────────────────

  setAnimation(state: AnimationState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateTime = 0;
    this.idleSubTimer = 0;
    this.idleSubState = 'breathing';

    if (state === 'sleeping') {
      this.eyeScaleY = 0.05;
    } else if (state === 'idle' || state === 'happy') {
      this.eyeScaleY = this.lerp(this.eyeScaleY, 1, 0.3);
      this.bodyContainer.alpha = this.lerp(this.bodyContainer.alpha, 1, 0.3);
      this.bodyContainer.scale.set(1);
    }

    if (state === 'spawning') {
      this.bodyContainer.alpha = 0;
      this.bodyContainer.scale.set(0.1);
      this.spawnParticles(25, 'sparkle');
    }

    if (state === 'dancing' || state === 'celebrating') {
      this.spawnParticles(18, 'confetti');
    }

    if (state === 'hiding') {
      this.spawnParticles(12, 'sparkle');
    }
  }

  setEmotion(emotion: EmotionalState): void {
    this.currentEmotion = emotion;
    this.drawMouth();
  }

  moveTo(x: number, y: number, duration = 2000): void {
    this.moveStartPos = { ...this.position };
    this.moveEndPos = { x, y };
    this.moveProgress = 0;
    this.moveDuration = duration;
    this.walkingStep = 0;

    const dx = x - this.position.x;
    this.direction = dx >= 0 ? 'right' : 'left';
    this.setAnimation('walking');
  }

  moveToEdge(edge: Edge, _progress: number): void {
    this.edge = edge;
    this.setAnimation('climbing');
  }

  teleportTo(x: number, y: number): void {
    this.position = { x, y };
    this.moveStartPos = { x, y };
    this.moveEndPos = { x, y };
  }

  lookAt(mouseX: number, mouseY: number): void {
    const dx = mouseX - this.position.x;
    const dy = mouseY - this.position.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx >= 0 ? 'right' : 'left';
    }
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.mouseOver = true;
  }

  setMouseOver(over: boolean): void {
    this.mouseOver = over;
    if (!over) {
      this.pupilOffX = this.lerp(this.pupilOffX, 0, 0.08);
      this.pupilOffY = this.lerp(this.pupilOffY, 0, 0.08);
    }
  }

  spawnAnimation(): void {
    this.bodyContainer.alpha = 0;
    this.bodyContainer.scale.set(0.1);
    this.container.alpha = 1;
    this.spawnParticles(30, 'sparkle');
    this.currentState = 'spawning';
    this.stateTime = 0;

    const startTime = Date.now();
    const animDuration = 900;

    const animStep = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / animDuration, 1);
      const eased = this.easeOutBack(t);

      this.bodyContainer.alpha = eased;
      this.bodyContainer.scale.set(0.1 + eased * 0.9);

      if (t < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.bodyContainer.alpha = 1;
        this.bodyContainer.scale.set(1);
        this.setAnimation('idle');
      }
    };

    requestAnimationFrame(animStep);
  }

  hideAnimation(onComplete: () => void): void {
    this.setAnimation('hiding');
    this.spawnParticles(16, 'sparkle');

    const startTime = Date.now();
    const animDuration = 600;

    const animStep = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / animDuration, 1);
      const eased = Math.pow(t, 3);

      this.bodyContainer.alpha = 1 - eased;
      this.bodyContainer.scale.set(1 - eased * 0.6);

      if (t < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.bodyContainer.alpha = 0;
        onComplete();
      }
    };

    requestAnimationFrame(animStep);
  }

  celebrateAnimation(): void {
    this.setAnimation('celebrating');
    this.setEmotion('celebrating');
    this.spawnParticles(35, 'confetti');
  }

  waveAnimation(): void {
    this.setAnimation('waving');
    this.spawnParticles(8, 'sparkle');

    setTimeout(() => {
      if (this.currentState === 'waving') {
        this.setAnimation('idle');
      }
    }, 1500);
  }

  danceAnimation(): void {
    this.setAnimation('dancing');
    this.setEmotion('excited');
    this.spawnParticles(20, 'confetti');

    setTimeout(() => {
      if (this.currentState === 'dancing') {
        this.setAnimation('idle');
        this.setEmotion('happy');
      }
    }, 2500);
  }

  setSkin(skin: string): void {
    const skins: Record<string, { body: number; shell: number; shellDark: number }> = {
      classic: { body: 0x4ade80, shell: 0x86efac, shellDark: 0x22c55e },
      golden: { body: 0xfbbf24, shell: 0xfde68a, shellDark: 0xd97706 },
      ocean: { body: 0x60a5fa, shell: 0x93c5fd, shellDark: 0x2563eb },
      sunset: { body: 0xf472b6, shell: 0xf9a8d4, shellDark: 0xdb2777 },
      forest: { body: 0x22c55e, shell: 0x4ade80, shellDark: 0x15803d },
      midnight: { body: 0x6366f1, shell: 0x818cf8, shellDark: 0x4338ca },
      ruby: { body: 0xef4444, shell: 0xfca5a5, shellDark: 0xb91c1c },
      amethyst: { body: 0xa78bfa, shell: 0xc4b5fd, shellDark: 0x7c3aed },
    };

    const colors = skins[skin] || skins.classic;
    this.skinColor = colors.body;
    this.shellColor = colors.shell;
    this.shellDarkColor = colors.shellDark;
    this.drawSnail();
  }

  getPosition(): Position {
    return { ...this.position };
  }

  getState(): AnimationState {
    return this.currentState;
  }

  getDirection(): Direction {
    return this.direction;
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.particles = [];
    this.app.destroy(true);
  }
}

function lightenColor(hex: number, amount: number): number {
  let r = (hex >> 16) & 0xff;
  let g = (hex >> 8) & 0xff;
  let b = hex & 0xff;
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  return (r << 16) | (g << 8) | b;
}
