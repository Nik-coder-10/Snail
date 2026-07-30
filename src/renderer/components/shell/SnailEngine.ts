import * as PIXI from 'pixi.js';
import type { Position, Direction, Edge, AnimationState, EmotionalState } from '../../../shared/types';
import { COLORS, PHYSICS, SKINS } from '../../styles/tokens';

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
  shape: 'circle' | 'star' | 'heart';
}

interface TrailSegment {
  x: number;
  y: number;
  alpha: number;
  width: number;
}

const BREATHE_SPEED: number = PHYSICS.BREATHE_SPEED;
const BLINK_INTERVAL_MIN: number = PHYSICS.BLINK_INTERVAL_MIN;
const BLINK_INTERVAL_MAX: number = PHYSICS.BLINK_INTERVAL_MAX;
const BLINK_DURATION: number = PHYSICS.BLINK_DURATION;
const DEFAULT_SCALE: number = PHYSICS.DEFAULT_SCALE;
const GRAVITY: number = PHYSICS.GRAVITY;
const SHELL_INERTIA_STRENGTH: number = PHYSICS.SHELL_INERTIA_STRENGTH;
const BODY_WAVE_SPEED: number = PHYSICS.BODY_WAVE_SPEED;
const MAX_TRAIL_LENGTH: number = PHYSICS.MAX_TRAIL_LENGTH;
const SLIME_ALPHA: number = PHYSICS.SLIME_ALPHA;
const CRAWL_SPEED_MULTIPLIER: number = PHYSICS.CRAWL_SPEED_MULTIPLIER;

export class SnailEngine {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private snailContainer: PIXI.Container;
  private bodyFoot: PIXI.Graphics;
  private bodyMain: PIXI.Graphics;
  private bodyHighlight: PIXI.Graphics;
  private shellGroup: PIXI.Container;
  private shellBase: PIXI.Graphics;
  private shellSpiral: PIXI.Graphics;
  private shellHighlight: PIXI.Graphics;
  private eyeStalkLeft: PIXI.Graphics;
  private eyeStalkRight: PIXI.Graphics;
  private eyeLeft: PIXI.Graphics;
  private eyeRight: PIXI.Graphics;
  private pupilLeft: PIXI.Graphics;
  private pupilRight: PIXI.Graphics;
  private eyeHighlightL: PIXI.Graphics;
  private eyeHighlightR: PIXI.Graphics;
  private mouth: PIXI.Graphics;
  private blushLeft: PIXI.Graphics;
  private blushRight: PIXI.Graphics;
  private feelerLeft: PIXI.Graphics;
  private feelerRight: PIXI.Graphics;
  private slimeTrail: PIXI.Graphics;
  private particles: Particle[] = [];
  private particlesGfx: PIXI.Graphics;
  private zzzContainer: PIXI.Container;
  private emotionIndicator: PIXI.Container;
  private shadow: PIXI.Graphics;
  private antennaLeft: PIXI.Graphics;
  private antennaRight: PIXI.Graphics;

  private currentState: AnimationState = 'idle';
  private currentEmotion: EmotionalState = 'happy';
  private direction: Direction = 'right';
  private edge: Edge = 'bottom';

  private position: Position = { x: 200, y: 200 };
  private velocity: Position = { x: 0, y: 0 };
  private targetPos: Position | null = null;

  private stateTime = 0;
  private totalTime = 0;
  private blinkTimer = 0;
  private blinkProgress = 0;
  private idleSubTimer = 0;
  private idleSubState: 'breathing' | 'looking' | 'stretching' | 'yawning' | 'waving' | 'cleaning' = 'breathing';
  private idleLookTarget = { x: 0, y: 0 };

  private bodySquash = 1;
  private bodyStretch = 1;
  private bodyWavePhase = 0;
  private bodyCompression = 0;
  private headTilt = 0;

  private shellLagX = 0;
  private shellLagY = 0;
  private shellRotate = 0;
  private shellBob = 0;

  private eyeScaleY = 1;
  private eyeStalkSwayL = 0;
  private eyeStalkSwayR = 0;
  private eyeStalkHeightL = 1;
  private eyeStalkHeightR = 1;
  private pupilOffX = 0;
  private pupilOffY = 0;
  private eyeTargetX = 0;
  private eyeTargetY = 0;
  private eyeStalkTargetHeightL = 1;
  private eyeStalkTargetHeightR = 1;

  private feelerSwayL = 0;
  private feelerSwayR = 0;
  private feelerTargetL = 0;
  private feelerTargetR = 0;

  private blushAlpha = 0;
  private mouthScale = 1;
  private mouthOpenness = 0;

  private skinColor: number = COLORS.accent;
  private skinColorLight: number = COLORS.accentLight;
  private skinColorDark: number = COLORS.accentDark;
  private shellColor: number = COLORS.accentLight;
  private shellColorDark: number = COLORS.accentDark;
  private shellColorLight: number = COLORS.accentExtraLight;

  private mouseOver: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private trailPoints: TrailSegment[] = [];
  private isMoving = false;
  private crawlPhase = 0;
  private crawlPauseTimer = 0;
  private isPausedDuringCrawl = false;
  private crawlCycleTimer = 0;

  private foodItem: PIXI.Graphics | null = null;
  private petHand: PIXI.Graphics | null = null;
  private petReactionPhase = 0;
  private petReactionTimer = 0;

  private celebrationTimer = 0;
  private celebrationPhase = 0;

  private shellSettleTimer: number = 0;
  private shellSettleVelocity: number = 0;
  private stopBounceTimer: number = 0;
  private bodyStopSquish: number = 0;
  private eyeBounceL: number = 0;
  private eyeBounceR: number = 0;
  private eyeBounceVL: number = 0;
  private eyeBounceVR: number = 0;

  private width: number;
  private height: number;

  private bodyBaseY = 0;
  private sleepZZTimer = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.width = width;
    this.height = height;

    this.app = new PIXI.Application();
    this.container = new PIXI.Container();
    this.snailContainer = new PIXI.Container();

    this.bodyFoot = new PIXI.Graphics();
    this.bodyMain = new PIXI.Graphics();
    this.bodyHighlight = new PIXI.Graphics();
    this.shellGroup = new PIXI.Container();
    this.shellBase = new PIXI.Graphics();
    this.shellSpiral = new PIXI.Graphics();
    this.shellHighlight = new PIXI.Graphics();
    this.eyeStalkLeft = new PIXI.Graphics();
    this.eyeStalkRight = new PIXI.Graphics();
    this.eyeLeft = new PIXI.Graphics();
    this.eyeRight = new PIXI.Graphics();
    this.pupilLeft = new PIXI.Graphics();
    this.pupilRight = new PIXI.Graphics();
    this.eyeHighlightL = new PIXI.Graphics();
    this.eyeHighlightR = new PIXI.Graphics();
    this.mouth = new PIXI.Graphics();
    this.blushLeft = new PIXI.Graphics();
    this.blushRight = new PIXI.Graphics();
    this.feelerLeft = new PIXI.Graphics();
    this.feelerRight = new PIXI.Graphics();
    this.slimeTrail = new PIXI.Graphics();
    this.particlesGfx = new PIXI.Graphics();
    this.zzzContainer = new PIXI.Container();
    this.emotionIndicator = new PIXI.Container();
    this.shadow = new PIXI.Graphics();
    this.antennaLeft = new PIXI.Graphics();
    this.antennaRight = new PIXI.Graphics();

    this.position = { x: width / 2, y: height * 0.7 };

    this.init(canvas, width, height);
  }

  async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    await this.app.init({
      canvas,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    this.container.sortableChildren = true;

    this.slimeTrail.zIndex = 0;
    this.shadow.zIndex = 2;
    this.snailContainer.zIndex = 10;
    this.particlesGfx.zIndex = 5;
    this.zzzContainer.zIndex = 20;
    this.emotionIndicator.zIndex = 15;

    this.snailContainer.addChild(this.shadow);
    this.snailContainer.addChild(this.bodyFoot);
    this.snailContainer.addChild(this.bodyMain);
    this.snailContainer.addChild(this.bodyHighlight);
    this.snailContainer.addChild(this.antennaLeft);
    this.snailContainer.addChild(this.antennaRight);
    this.snailContainer.addChild(this.shellGroup);
    this.snailContainer.addChild(this.feelerLeft);
    this.snailContainer.addChild(this.feelerRight);
    this.snailContainer.addChild(this.eyeStalkLeft);
    this.snailContainer.addChild(this.eyeStalkRight);
    this.snailContainer.addChild(this.eyeLeft);
    this.snailContainer.addChild(this.eyeRight);
    this.snailContainer.addChild(this.eyeHighlightL);
    this.snailContainer.addChild(this.eyeHighlightR);
    this.snailContainer.addChild(this.pupilLeft);
    this.snailContainer.addChild(this.pupilRight);
    this.snailContainer.addChild(this.blushLeft);
    this.snailContainer.addChild(this.blushRight);
    this.snailContainer.addChild(this.mouth);

    this.shellGroup.addChild(this.shellBase);
    this.shellGroup.addChild(this.shellSpiral);
    this.shellGroup.addChild(this.shellHighlight);

    this.container.addChild(this.slimeTrail);
    this.container.addChild(this.particlesGfx);
    this.container.addChild(this.snailContainer);
    this.container.addChild(this.zzzContainer);
    this.container.addChild(this.emotionIndicator);

    this.app.stage.addChild(this.container);
    this.app.ticker.add(() => this.update());
    this.drawSnail();
  }

  private lerp(current: number, target: number, speed: number): number {
    return current + (target - current) * Math.min(speed, 1);
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  private rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private lerpAngle(current: number, target: number, speed: number): number {
    let diff = target - current;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * speed;
  }

  private drawSnail(): void {
    const s = DEFAULT_SCALE;

    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;
    const footHeight = 8 * s;
    const shellRadius = 32 * s;
    const shellCenterX = 5 * s;
    const shellCenterY = -bodyHeight * 0.5 - 5 * s;

    this.shadow.clear();
    this.shadow.beginFill(COLORS.black, 0.1);
    this.shadow.ellipse(0, bodyHeight * 0.6, bodyLength * 0.5, 6 * s);
    this.shadow.endFill();

    this.bodyFoot.clear();
    this.bodyFoot.beginFill(this.skinColorDark, 0.3);
    this.bodyFoot.ellipse(0, bodyHeight * 0.45, bodyLength * 0.48, footHeight * 0.7);
    this.bodyFoot.endFill();

    this.bodyMain.clear();
    this.bodyMain.beginFill(this.skinColor, 1);
    this.bodyMain.ellipse(0, 0, bodyLength * 0.5, bodyHeight * 0.5);
    this.bodyMain.endFill();

    this.bodyMain.beginFill(this.skinColor, 0.3);
    this.bodyMain.ellipse(bodyLength * 0.12, -bodyHeight * 0.08, bodyLength * 0.35, bodyHeight * 0.25);
    this.bodyMain.endFill();

    const gradSteps = 6;
    for (let i = 0; i < gradSteps; i++) {
      const t = i / gradSteps;
      const alpha = 0.04 * (1 - t);
      const r = bodyLength * 0.48 * (1 - t * 0.3);
      this.bodyMain.beginFill(COLORS.white, alpha);
      this.bodyMain.ellipse(bodyLength * 0.15 * (1 - t * 0.5), -bodyHeight * 0.2 * (1 - t), r, bodyHeight * 0.35 * (1 - t * 0.3));
      this.bodyMain.endFill();
    }

    this.bodyHighlight.clear();
    this.bodyHighlight.beginFill(COLORS.white, 0.12);
    this.bodyHighlight.ellipse(bodyLength * 0.08, -bodyHeight * 0.2, bodyLength * 0.28, bodyHeight * 0.15);
    this.bodyHighlight.endFill();

    this.bodyHighlight.beginFill(COLORS.white, 0.06);
    this.bodyHighlight.ellipse(bodyLength * 0.2, -bodyHeight * 0.28, bodyLength * 0.15, bodyHeight * 0.08);
    this.bodyHighlight.endFill();

    this.drawShell(shellCenterX, shellCenterY, shellRadius);

    const eyeY = -bodyHeight * 0.6 - 10 * s;
    const eyeLX = bodyLength * 0.25;
    const eyeRX = bodyLength * 0.4;

    const stalkWidth = 2.5 * s;
    const eyeRadius = 7 * s;

    this.eyeStalkLeft.clear();
    this.eyeStalkLeft.lineStyle(stalkWidth, this.skinColorLight, 1);
    this.eyeStalkLeft.moveTo(bodyLength * 0.2, -bodyHeight * 0.35);
    this.eyeStalkLeft.lineTo(eyeLX, eyeY);

    this.eyeStalkRight.clear();
    this.eyeStalkRight.lineStyle(stalkWidth, this.skinColorLight, 1);
    this.eyeStalkRight.moveTo(bodyLength * 0.3, -bodyHeight * 0.35);
    this.eyeStalkRight.lineTo(eyeRX, eyeY);

    this.eyeLeft.clear();
    this.eyeLeft.beginFill(COLORS.eyeWhite, 1);
    this.eyeLeft.circle(eyeLX, eyeY, eyeRadius);
    this.eyeLeft.endFill();
    this.eyeLeft.beginFill(COLORS.eyeBlue, 0.2);
    this.eyeLeft.circle(eyeLX, eyeY, eyeRadius * 0.6);
    this.eyeLeft.endFill();

    this.eyeRight.clear();
    this.eyeRight.beginFill(COLORS.eyeWhite, 1);
    this.eyeRight.circle(eyeRX, eyeY, eyeRadius);
    this.eyeRight.endFill();
    this.eyeRight.beginFill(COLORS.eyeBlue, 0.2);
    this.eyeRight.circle(eyeRX, eyeY, eyeRadius * 0.6);
    this.eyeRight.endFill();

    this.eyeHighlightL.clear();
    this.eyeHighlightL.beginFill(COLORS.white, 0.7);
    this.eyeHighlightL.circle(eyeLX - eyeRadius * 0.3, eyeY - eyeRadius * 0.3, eyeRadius * 0.35);
    this.eyeHighlightL.endFill();

    this.eyeHighlightR.clear();
    this.eyeHighlightR.beginFill(COLORS.white, 0.7);
    this.eyeHighlightR.circle(eyeRX - eyeRadius * 0.3, eyeY - eyeRadius * 0.3, eyeRadius * 0.35);
    this.eyeHighlightR.endFill();

    this.pupilLeft.clear();
    this.pupilLeft.beginFill(COLORS.pupil, 1);
    this.pupilLeft.circle(eyeLX + 1.5 * s, eyeY, 3.5 * s);
    this.pupilLeft.endFill();
    this.pupilLeft.beginFill(COLORS.white, 0.4);
    this.pupilLeft.circle(eyeLX + 2.5 * s, eyeY - 1.5 * s, 1.2 * s);
    this.pupilLeft.endFill();

    this.pupilRight.clear();
    this.pupilRight.beginFill(COLORS.pupil, 1);
    this.pupilRight.circle(eyeRX + 1.5 * s, eyeY, 3.5 * s);
    this.pupilRight.endFill();
    this.pupilRight.beginFill(COLORS.white, 0.4);
    this.pupilRight.circle(eyeRX + 2.5 * s, eyeY - 1.5 * s, 1.2 * s);
    this.pupilRight.endFill();

    this.antennaLeft.clear();
    this.antennaLeft.lineStyle(1.5 * s, this.skinColorDark, 0.6);
    this.antennaLeft.moveTo(bodyLength * 0.1, -bodyHeight * 0.35);
    this.antennaLeft.bezierCurveTo(0, -bodyHeight * 1.2, -bodyLength * 0.25, -bodyHeight * 1.1, -bodyLength * 0.2, -bodyHeight * 0.7);

    this.antennaRight.clear();
    this.antennaRight.lineStyle(1.5 * s, this.skinColorDark, 0.6);
    this.antennaRight.moveTo(bodyLength * 0.18, -bodyHeight * 0.35);
    this.antennaRight.bezierCurveTo(bodyLength * 0.1, -bodyHeight * 1.15, bodyLength * 0.35, -bodyHeight * 1.05, bodyLength * 0.3, -bodyHeight * 0.65);

    this.feelerLeft.clear();
    this.feelerLeft.lineStyle(1.2 * s, this.skinColor, 0.4);
    this.feelerLeft.moveTo(-bodyLength * 0.35, -bodyHeight * 0.1);
    this.feelerLeft.lineTo(-bodyLength * 0.55, bodyHeight * 0.1);

    this.feelerRight.clear();
    this.feelerRight.lineStyle(1.2 * s, this.skinColor, 0.4);
    this.feelerRight.moveTo(-bodyLength * 0.35, bodyHeight * 0.05);
    this.feelerRight.lineTo(-bodyLength * 0.55, bodyHeight * 0.2);

    this.drawMouth();
    this.drawBlush();
  }

  private drawShell(cx: number, cy: number, radius: number): void {
    const s = DEFAULT_SCALE;

    this.shellBase.clear();
    this.shellBase.beginFill(this.shellColor, 1);
    this.shellBase.drawEllipse(cx, cy, radius * 0.85, radius * 1.0);
    this.shellBase.endFill();

    this.shellBase.beginFill(this.shellColorDark, 0.08);
    this.shellBase.drawEllipse(cx, cy - radius * 0.08, radius * 0.7, radius * 0.8);
    this.shellBase.endFill();

    this.shellSpiral.clear();
    this.shellSpiral.lineStyle(2.5 * s, this.shellColorDark, 0.3);

    const spiralPoints = 60;
    const startX = cx;
    const startY = cy;
    const maxR = radius * 0.7;
    const turns = 3.5;

    let px = startX;
    let py = startY;

    for (let i = 0; i <= spiralPoints; i++) {
      const t = i / spiralPoints;
      const r = maxR * t;
      const angle = t * turns * Math.PI * 2;
      const x = startX + Math.cos(angle) * r;
      const y = startY + Math.sin(angle) * r * 0.6;

      if (i === 0) {
        this.shellSpiral.moveTo(x, y);
      } else {
        this.shellSpiral.lineTo(x, y);
      }
      px = x;
      py = y;
    }

    this.shellSpiral.lineStyle(1.5 * s, this.shellColorDark, 0.15);
    const innerTurns = 2;
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const r = radius * 0.5 * t;
      const angle = t * innerTurns * Math.PI * 2 + 0.5;
      const x = cx + radius * 0.15 + Math.cos(angle) * r;
      const y = cy - radius * 0.1 + Math.sin(angle) * r * 0.6;
      if (i === 0) {
        this.shellSpiral.moveTo(x, y);
      } else {
        this.shellSpiral.lineTo(x, y);
      }
    }

    this.shellHighlight.clear();
    this.shellHighlight.beginFill(COLORS.white, 0.15);
    this.shellHighlight.ellipse(cx - radius * 0.25, cy - radius * 0.35, radius * 0.3, radius * 0.25);
    this.shellHighlight.endFill();

    this.shellHighlight.beginFill(COLORS.white, 0.08);
    this.shellHighlight.ellipse(cx - radius * 0.1, cy - radius * 0.5, radius * 0.2, radius * 0.12);
    this.shellHighlight.endFill();

    this.shellBase.lineStyle(2 * s, COLORS.black, 0.06);
    this.shellBase.drawEllipse(cx, cy, radius * 0.85, radius * 1.0);
    this.shellBase.lineStyle(0);
  }

  private drawMouth(): void {
    const s = DEFAULT_SCALE;
    this.mouth.clear();

    if (this.currentState === 'sleeping') return;

    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;
    const mx = bodyLength * 0.25;
    const my = bodyHeight * 0.15;

    this.mouth.lineStyle(1.8 * s, this.skinColorDark, 0.6);

    switch (this.currentEmotion) {
      case 'happy':
      case 'excited':
      case 'celebrating':
      case 'grateful':
        this.mouth.arc(mx, my, 5 * s, 0.15, Math.PI - 0.15);
        break;
      case 'confused':
        this.mouth.moveTo(mx - 4 * s, my + 1 * s);
        this.mouth.lineTo(mx - 1 * s, my + 3 * s);
        this.mouth.lineTo(mx + 2 * s, my + 1 * s);
        break;
      case 'thinking':
      case 'working':
        this.mouth.moveTo(mx - 5 * s, my + 2 * s);
        this.mouth.lineTo(mx + 5 * s, my + 2 * s);
        break;
      case 'surprised':
        this.mouth.beginFill(COLORS.pupil, 0.25);
        this.mouth.ellipse(mx, my + 1 * s, 4 * s, 5 * s);
        this.mouth.endFill();
        break;
      case 'sleepy':
        this.mouth.arc(mx, my, 3 * s, 0.3, Math.PI - 0.3);
        break;
      case 'curious':
        this.mouth.moveTo(mx - 3 * s, my + 2 * s);
        this.mouth.quadraticCurveTo(mx, my - 1 * s, mx + 3 * s, my + 2 * s);
        break;
      default:
        this.mouth.arc(mx, my, 3.5 * s, 0.15, Math.PI - 0.15);
        break;
    }
  }

  private drawBlush(): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;

    this.blushLeft.clear();
    this.blushRight.clear();

    if (this.currentEmotion === 'happy' || this.currentEmotion === 'grateful' ||
        this.currentEmotion === 'excited' || this.blushAlpha > 0.01) {
      const alpha = Math.max(0.15, this.blushAlpha);
      this.blushLeft.beginFill(COLORS.blush, alpha);
      this.blushLeft.ellipse(bodyLength * 0.15, bodyHeight * 0.12, 6 * s, 4 * s);
      this.blushLeft.endFill();

      this.blushRight.beginFill(COLORS.blush, alpha);
      this.blushRight.ellipse(bodyLength * 0.35, bodyHeight * 0.12, 6 * s, 4 * s);
      this.blushRight.endFill();
    }
  }

  private drawFood(): void {
    if (this.foodItem) {
      this.snailContainer.removeChild(this.foodItem);
      this.foodItem.destroy();
      this.foodItem = null;
    }

    const s = DEFAULT_SCALE;
    const leaf = new PIXI.Graphics();
    const bodyLength = 70 * s;

    leaf.beginFill(COLORS.accent, 0.9);
    leaf.ellipse(bodyLength * 0.55, -5 * s, 10 * s, 6 * s);
    leaf.endFill();
    leaf.beginFill(COLORS.accentDark, 0.5);
    leaf.ellipse(bodyLength * 0.55, -5 * s, 6 * s, 3 * s);
    leaf.endFill();
    leaf.lineStyle(1 * s, 0x166534, 0.6);
    leaf.moveTo(bodyLength * 0.55, -5 * s);
    leaf.lineTo(bodyLength * 0.5, -5 * s);

    this.foodItem = leaf;
    this.foodItem.zIndex = 9;
    this.snailContainer.addChild(this.foodItem);

    this.foodItem.alpha = 1;
    this.foodItem.scale.set(0.5);
  }

  private drawPetHand(): void {
    if (this.petHand) {
      this.snailContainer.removeChild(this.petHand);
      this.petHand.destroy();
      this.petHand = null;
    }

    const s = DEFAULT_SCALE;
    const hand = new PIXI.Graphics();
    const bodyLength = 70 * s;

    hand.beginFill(COLORS.hand, 0.9);
    hand.circle(bodyLength * 0.55, -bodyLength * 0.45, 8 * s);
    hand.endFill();
    hand.beginFill(COLORS.handShadow, 0.5);
    hand.ellipse(bodyLength * 0.5, -bodyLength * 0.48, 5 * s, 4 * s);
    hand.endFill();
    hand.lineStyle(1 * s, COLORS.handDark, 0.4);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 0.6 - Math.PI * 0.3;
      hand.moveTo(
        bodyLength * 0.55 + Math.cos(angle) * 6 * s,
        -bodyLength * 0.45 + Math.sin(angle) * 6 * s
      );
      hand.lineTo(
        bodyLength * 0.55 + Math.cos(angle) * 10 * s,
        -bodyLength * 0.45 + Math.sin(angle) * 10 * s
      );
    }

    this.petHand = hand;
    this.petHand.zIndex = 12;
    this.snailContainer.addChild(this.petHand);
    this.petHand.alpha = 0;
  }

  private update(): void {
    const dt = this.app.ticker.deltaMS;
    this.totalTime += dt;
    this.stateTime += dt;

    this.updateBlink(dt);
    this.updateIdleSubBehaviors(dt);
    this.applyBreathing(dt);
    this.applyBodyWave(dt);
    this.applyShellInertia(dt);
    this.applyEyeAnimations(dt);
    this.applyAntennaSway(dt);

    const prevState = this.currentState;

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
      case 'eating':
        this.updateEating(dt);
        break;
      case 'petting':
        this.updatePetting(dt);
        break;
      case 'talking':
        this.updateTalking(dt);
        break;
    }

    this.updateTrail(dt);
    this.updateParticles(dt);
    this.updateZZZ(dt);
    this.updateEmotionIndicator();

    if (prevState === 'walking' && this.currentState !== 'walking') {
      this.bodyStopSquish = PHYSICS.BODY_SQUISH_ON_STOP;
      this.eyeBounceL = PHYSICS.EYE_BOUNCE_STRENGTH;
      this.eyeBounceR = PHYSICS.EYE_BOUNCE_STRENGTH * 0.85;
      this.eyeBounceVL = 0.3;
      this.eyeBounceVR = 0.25;
    }

    if (this.bodyStopSquish > 0) {
      this.bodyStopSquish = this.lerp(this.bodyStopSquish, 0, PHYSICS.BODY_SQUISH_RECOVERY);
      this.bodyCompression += this.bodyStopSquish;
    }

    this.render();
  }

  private applyBreathing(dt: number): void {
    let speed = BREATHE_SPEED;
    let amplitude = 2.5;

    switch (this.currentState) {
      case 'sleeping':
        speed = 0.012;
        amplitude = 4;
        break;
      case 'walking':
        speed = 0.05;
        amplitude = 3;
        break;
      case 'dancing':
      case 'celebrating':
        speed = 0.1;
        amplitude = 5;
        break;
      case 'thinking':
        speed = 0.02;
        amplitude = 1.5;
        break;
    }

    const breathVal = Math.sin(this.totalTime * speed) * amplitude;
    const targetSquash = 1 + Math.sin(this.totalTime * speed) * 0.015;
    const targetStretch = 1 + Math.sin(this.totalTime * speed + Math.PI) * 0.01;

    this.bodySquash = this.lerp(this.bodySquash, targetSquash, 0.05);
    this.bodyStretch = this.lerp(this.bodyStretch, targetStretch, 0.05);
    this.bodyBaseY = this.lerp(this.bodyBaseY, breathVal * 0.15, 0.08);
  }

  private applyBodyWave(dt: number): void {
    if (this.currentState === 'walking' && !this.isPausedDuringCrawl) {
      this.bodyWavePhase += dt * BODY_WAVE_SPEED * CRAWL_SPEED_MULTIPLIER;

      const wave = Math.sin(this.bodyWavePhase);
      const wave2 = Math.sin(this.bodyWavePhase * 1.5 + 1);

      this.bodyCompression = this.lerp(this.bodyCompression, wave * 0.08, 0.1);
      this.headTilt = this.lerp(this.headTilt, wave2 * 0.03, 0.08);
    } else {
      this.bodyCompression = this.lerp(this.bodyCompression, 0, 0.05);
      this.headTilt = this.lerp(this.headTilt, 0, 0.05);
    }
  }

  private applyShellInertia(dt: number): void {
    if (this.currentState === 'walking' && !this.isPausedDuringCrawl) {
      const dx = this.velocity.x * dt * 0.1;
      const dy = this.velocity.y * dt * 0.1;
      this.shellLagX = this.lerp(this.shellLagX, -dx * 0.5, SHELL_INERTIA_STRENGTH);
      this.shellLagY = this.lerp(this.shellLagY, -dy * 0.3, SHELL_INERTIA_STRENGTH);

      this.shellSettleTimer = 0;
      this.shellSettleVelocity = 0;
    } else {
      this.shellLagX = this.lerp(this.shellLagX, 0, 0.06);
      this.shellLagY = this.lerp(this.shellLagY, 0, 0.06);

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
      this.shellRotate = this.lerp(this.shellRotate, bodySway * 0.02, 0.08);
    } else if (this.currentState === 'dancing' || this.currentState === 'celebrating') {
      this.shellRotate = this.lerp(this.shellRotate, Math.sin(this.totalTime * 0.005) * 0.1, 0.1);
    } else {
      const settleRotate = this.shellSettleTimer < 400
        ? Math.sin(this.shellSettleTimer * 0.01) * 0.015 * (1 - this.shellSettleTimer / 400)
        : 0;
      this.shellRotate = this.lerp(this.shellRotate, settleRotate, 0.06);
    }

    this.shellBob = this.lerp(this.shellBob, this.bodyCompression * (-2), 0.1);
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
    } else if (this.currentState === 'idle' || this.currentState === 'happy') {
      switch (this.idleSubState) {
        case 'looking':
          targetEyeX = this.idleLookTarget.x;
          targetEyeY = this.idleLookTarget.y;
          break;
        case 'stretching':
          targetEyeY = -3;
          break;
        case 'yawning':
          targetEyeY = -2;
          break;
      }
    }

    this.eyeTargetX = targetEyeX;
    this.eyeTargetY = targetEyeY;
    this.pupilOffX = this.lerp(this.pupilOffX, targetEyeX, 0.06);
    this.pupilOffY = this.lerp(this.pupilOffY, targetEyeY, 0.06);

    let lTarget = 1;
    let rTarget = 1;
    if (this.currentState === 'sleeping') {
      lTarget = 0.3;
      rTarget = 0.3;
    } else if (this.currentEmotion === 'curious') {
      lTarget = 1.2;
      rTarget = 1.1;
    } else if (this.currentEmotion === 'excited') {
      lTarget = 1.15;
      rTarget = 1.15;
    }

    this.eyeStalkHeightL = this.lerp(this.eyeStalkHeightL, lTarget, 0.04);
    this.eyeStalkHeightR = this.lerp(this.eyeStalkHeightR, rTarget, 0.04);

    const swaySpeed = 0.03;
    const swayAmp = this.currentState === 'walking' ? 0.06 : 0.03;
    const sL = Math.sin(this.totalTime * swaySpeed * 1.1) * swayAmp;
    const sR = Math.sin(this.totalTime * swaySpeed * 0.9 + 0.8) * swayAmp;

    this.eyeStalkSwayL = this.lerp(this.eyeStalkSwayL, sL, 0.08);
    this.eyeStalkSwayR = this.lerp(this.eyeStalkSwayR, sR, 0.08);

    if (this.currentState !== 'walking') {
      this.eyeBounceVL *= PHYSICS.EYE_BOUNCE_DAMPING;
      this.eyeBounceVR *= PHYSICS.EYE_BOUNCE_DAMPING;

      const bounceTargetL = this.eyeStalkHeightL + this.eyeBounceL;
      this.eyeStalkHeightL = this.lerp(this.eyeStalkHeightL, bounceTargetL + this.eyeBounceVL, 0.02);
      this.eyeStalkHeightR = this.lerp(this.eyeStalkHeightR, bounceTargetL + this.eyeBounceVR, 0.02);
    }
  }

  private applyAntennaSway(dt: number): void {
    const speed = 0.02;
    let amp = this.currentState === 'walking' ? 0.04 : 0.02;
    if (this.currentEmotion === 'curious' || this.currentEmotion === 'excited') amp = 0.08;

    const tL = Math.sin(this.totalTime * speed * 1.2) * amp;
    const tR = Math.sin(this.totalTime * speed * 0.8 + 1.2) * amp;

    this.feelerSwayL = this.lerp(this.feelerSwayL, tL, 0.06);
    this.feelerSwayR = this.lerp(this.feelerSwayR, tR, 0.06);
  }

  private updateBlink(dt: number): void {
    if (this.currentState === 'sleeping') {
      this.eyeScaleY = this.lerp(this.eyeScaleY, 0.05, 0.12);
      return;
    }

    this.blinkTimer += dt;

    const minInterval = this.mouseOver ? BLINK_INTERVAL_MIN * 0.4 : BLINK_INTERVAL_MIN;
    const maxInterval = this.mouseOver ? BLINK_INTERVAL_MAX * 0.35 : BLINK_INTERVAL_MAX;

    if (this.blinkTimer > this.rand(minInterval, maxInterval)) {
      this.blinkTimer = 0;
      this.blinkProgress = 0;
    }

    if (this.blinkProgress < BLINK_DURATION) {
      this.blinkProgress += dt;
      const t = this.blinkProgress / BLINK_DURATION;
      if (t < 0.2) {
        this.eyeScaleY = this.lerp(this.eyeScaleY, 0.05, 0.5);
      } else if (t < 0.5) {
        this.eyeScaleY = this.lerp(this.eyeScaleY, 1, 0.4);
      } else {
        this.eyeScaleY = this.lerp(this.eyeScaleY, 1, 0.06);
      }
    }
  }

  private updateIdleSubBehaviors(dt: number): void {
    if (this.currentState !== 'idle' && this.currentState !== 'happy') return;
    this.idleSubTimer += dt;

    if (this.idleSubTimer > 4000 && this.idleSubState === 'breathing') {
      this.idleSubTimer = 0;
      const roll = Math.random();
      if (roll < 0.35) {
        this.idleSubState = 'looking';
        this.idleLookTarget = {
          x: this.rand(-3, 3),
          y: this.rand(-2, 1),
        };
      } else if (roll < 0.55) {
        this.idleSubState = 'stretching';
      } else if (roll < 0.7) {
        this.idleSubState = 'yawning';
      } else if (roll < 0.85) {
        this.idleSubState = 'waving';
      } else {
        this.idleSubState = 'cleaning';
      }
    }

    switch (this.idleSubState) {
      case 'looking':
        if (this.idleSubTimer > 2000) {
          this.idleSubTimer = 0;
          this.idleSubState = 'breathing';
        }
        break;
      case 'stretching':
        if (this.idleSubTimer > 1800) {
          this.idleSubTimer = 0;
          this.idleSubState = 'breathing';
        }
        break;
      case 'yawning':
        if (this.idleSubTimer > 1500) {
          this.idleSubTimer = 0;
          this.idleSubState = 'breathing';
        }
        break;
      case 'waving':
        if (this.idleSubTimer > 1500) {
          this.idleSubTimer = 0;
          this.idleSubState = 'breathing';
        }
        break;
      case 'cleaning':
        if (this.idleSubTimer > 2000) {
          this.idleSubTimer = 0;
          this.idleSubState = 'breathing';
        }
        break;
    }
  }

  private updateWalking(dt: number): void {
    if (!this.targetPos) {
      this.setAnimation('idle');
      return;
    }

    if (this.isPausedDuringCrawl) {
      this.crawlPauseTimer -= dt;
      if (this.crawlPauseTimer <= 0) {
        this.isPausedDuringCrawl = false;
      }
      return;
    }

    const dx = this.targetPos.x - this.position.x;
    const dy = this.targetPos.y - this.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.position = { ...this.targetPos };
      this.targetPos = null;
      this.setAnimation('idle');
      return;
    }

    const normX = dx / dist;
    const normY = dy / dist;

    const slowDownDist = PHYSICS.APPROACH_SLOW_DOWN_DIST;
    const speedMultiplier = Math.min(dist / slowDownDist, 1);
    const speed = (0.04 + this.rand(0, 0.01)) * Math.max(speedMultiplier, 0.15);

    const desiredVx = normX * speed * dt;
    const desiredVy = normY * speed * dt;

    this.velocity.x = this.lerp(this.velocity.x, desiredVx, 0.1);
    this.velocity.y = this.lerp(this.velocity.y, desiredVy, 0.1);

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    this.direction = dx >= 0 ? 'right' : 'left';

    this.crawlCycleTimer += dt * CRAWL_SPEED_MULTIPLIER;
    if (this.crawlCycleTimer > 3000 + this.rand(0, 2000)) {
      this.crawlCycleTimer = 0;
      if (Math.random() < 0.3) {
        this.isPausedDuringCrawl = true;
        this.crawlPauseTimer = 500 + Math.random() * 1500;
      }
    }

    this.blushAlpha = this.lerp(this.blushAlpha, 0, 0.02);
    this.shellSettleTimer = 0;
    this.shellSettleVelocity = 0;
  }

  private updateSleeping(dt: number): void {
    this.sleepZZTimer += dt;
    if (this.sleepZZTimer > 1500) {
      this.sleepZZTimer = 0;
      this.addZZZ();
    }
    this.blushAlpha = this.lerp(this.blushAlpha, 0, 0.02);
  }

  private updateSpawnFade(dt: number): void {
    if (this.stateTime > 1200) {
      this.setAnimation('idle');
    }
  }

  private updateHideOut(dt: number): void {
    if (this.stateTime > 500) {
      this.snailContainer.alpha = 0;
      this.snailContainer.scale.set(0.2);
    }
  }

  private updateCelebration(dt: number): void {
    this.celebrationTimer += dt;

    if (this.celebrationTimer > this.celebrationPhase * 500 + 200) {
      this.celebrationPhase++;
      if (this.celebrationPhase < 4) {
        const types: Array<'burst' | 'confetti' | 'sparkle'> = ['burst', 'confetti', 'sparkle', 'confetti'];
        this.spawnParticles(8 + this.rand(0, 8), types[this.celebrationPhase % types.length]);
      }
    }

    if (this.celebrationTimer > 3000) {
      this.setAnimation('idle');
      this.setEmotion('happy');
    }
    this.blushAlpha = this.lerp(this.blushAlpha, 0.3, 0.02);
  }

  private updateEating(dt: number): void {
    if (this.stateTime < 600) {
      if (this.foodItem) {
        const t = this.stateTime / 600;
        this.foodItem.scale.set(0.5 + t * 0.5);
        this.foodItem.alpha = Math.min(1, t * 2);
        this.foodItem.x = (1 - t) * 20;
        this.foodItem.y = (1 - t) * 10;
      }
      this.mouthOpenness = this.lerp(this.mouthOpenness, 0.5, 0.1);
    } else if (this.stateTime < 4000) {
      if (this.foodItem) {
        const chewPhase = Math.sin(this.stateTime * 0.03);
        this.foodItem.scale.set(1 + chewPhase * 0.05);
        this.foodItem.y = chewPhase * 2;
      }
      this.mouthOpenness = this.lerp(this.mouthOpenness, 0.3 + Math.sin(this.stateTime * 0.04) * 0.1, 0.08);
      this.blushAlpha = this.lerp(this.blushAlpha, 0.2, 0.01);

      if (this.stateTime > 1000 && this.stateTime < 1100) {
        this.spawnParticles(3, 'sparkle');
      }
    } else if (this.stateTime < 5000) {
      if (this.foodItem) {
        this.foodItem.alpha = this.lerp(this.foodItem.alpha, 0, 0.04);
      }
      this.mouthOpenness = this.lerp(this.mouthOpenness, 0, 0.06);
      this.blushAlpha = this.lerp(this.blushAlpha, 0.3, 0.02);
    } else {
      if (this.foodItem) {
        this.snailContainer.removeChild(this.foodItem);
        this.foodItem.destroy();
        this.foodItem = null;
      }
      this.mouthOpenness = 0;
      this.blushAlpha = this.lerp(this.blushAlpha, 0.15, 0.02);
      this.setAnimation('happy');
      this.setEmotion('grateful');
    }
  }

  private updatePetting(dt: number): void {
    this.petReactionTimer += dt;

    if (this.stateTime < 400) {
      if (this.petHand) {
        const t = this.stateTime / 400;
        this.petHand.alpha = t;
        this.petHand.y = -10 + t * 10;
        this.petHand.scale.set(0.6 + t * 0.4);
      }
      this.eyeStalkTargetHeightL = 1.1;
      this.eyeStalkTargetHeightR = 1.1;
    } else if (this.stateTime < 2000) {
      this.blushAlpha = this.lerp(this.blushAlpha, 0.4, 0.03);
      this.eyeStalkTargetHeightL = 0.9;
      this.eyeStalkTargetHeightR = 0.9;

      const petPhase = Math.sin(this.stateTime * 0.005);
      if (this.petHand) {
        this.petHand.y = petPhase * 3;
        this.petHand.rotation = petPhase * 0.1;
      }

      if (this.petReactionTimer > 300) {
        this.petReactionTimer = 0;
        this.petReactionPhase++;
        if (this.petReactionPhase === 1) {
          this.spawnParticles(4, 'sparkle');
        } else if (this.petReactionPhase === 2) {
          this.spawnParticles(3, 'burst');
        } else if (this.petReactionPhase === 3) {
          this.spawnHearts(3);
        }
      }

      this.bodySquash = this.lerp(this.bodySquash, 0.95, 0.04);
    } else if (this.stateTime < 2500) {
      if (this.petHand) {
        this.petHand.alpha = this.lerp(this.petHand.alpha, 0, 0.06);
      }
      this.blushAlpha = this.lerp(this.blushAlpha, 0.2, 0.02);
    } else {
      if (this.petHand) {
        this.snailContainer.removeChild(this.petHand);
        this.petHand.destroy();
        this.petHand = null;
      }
      this.blushAlpha = this.lerp(this.blushAlpha, 0, 0.02);
      this.eyeStalkTargetHeightL = 1;
      this.eyeStalkTargetHeightR = 1;
      this.setAnimation('happy');
      this.setEmotion('grateful');
    }

    this.mouthScale = this.lerp(this.mouthScale, 1.2, 0.05);
    this.bodyCompression = this.lerp(this.bodyCompression, 0.03, 0.05);
  }

  private updateTalking(dt: number): void {
    if (this.currentState !== 'talking') return;

    const talkPhase = Math.sin(this.stateTime * 0.015);
    this.mouthOpenness = this.lerp(this.mouthOpenness, 0.3 + talkPhase * 0.15, 0.1);
    this.headTilt = this.lerp(this.headTilt, talkPhase * 0.02, 0.06);

    if (this.stateTime > 3000) {
      this.setAnimation('idle');
    }
  }

  private updateTrail(dt: number): void {
    if (this.currentState === 'walking') {
      if (this.totalTime % 100 < dt) {
        this.trailPoints.push({
          x: this.position.x,
          y: this.position.y + 15,
          alpha: SLIME_ALPHA,
          width: 6 + Math.random() * 4,
        });
        if (this.trailPoints.length > MAX_TRAIL_LENGTH) {
          this.trailPoints.shift();
        }
      }
    }

    this.slimeTrail.clear();

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p0 = this.trailPoints[i - 1];
      const p1 = this.trailPoints[i];
      const ageRatio = i / this.trailPoints.length;
      const alpha = p0.alpha * ageRatio;
      const width = p0.width * ageRatio;

      if (alpha < 0.01) continue;

      const wobble = Math.sin(this.totalTime * 0.001 + i) * 0.5;
      this.slimeTrail.lineStyle(width, this.shellColorLight, alpha);
      this.slimeTrail.moveTo(p0.x + wobble, p0.y);
      this.slimeTrail.lineTo(p1.x + wobble, p1.y);
    }

    if (this.currentState !== 'walking' && this.trailPoints.length > 0) {
      this.trailPoints.splice(0, 1);
      if (this.trailPoints.length === 0) {
        this.slimeTrail.clear();
      }
    }
  }

  private updateParticles(dt: number): void {
    this.particlesGfx.clear();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.rotation += p.rotationSpeed;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.particlesGfx.beginFill(p.color, p.alpha);
      if (p.shape === 'star') {
        this.drawStar(this.particlesGfx, p.x, p.y, p.size, p.rotation);
      } else if (p.shape === 'heart') {
        this.drawHeart(this.particlesGfx, p.x, p.y, p.size, p.rotation);
      } else {
        this.particlesGfx.drawCircle(p.x, p.y, p.size);
      }
      this.particlesGfx.endFill();
    }
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

  private drawHeart(g: PIXI.Graphics, cx: number, cy: number, r: number, rot: number): void {
    g.moveTo(cx, cy + r * 0.3);
    g.bezierCurveTo(cx + r, cy + r, cx + r * 0.3, cy - r * 0.5, cx, cy - r * 0.2);
    g.bezierCurveTo(cx - r * 0.3, cy - r * 0.5, cx - r, cy + r, cx, cy + r * 0.3);
    g.closePath();
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
      this.skinColor,
      lightenColor(this.skinColor, 40),
      this.shellColor,
      lightenColor(this.shellColor, 30),
      COLORS.accent,
      0x60a5fa,
      COLORS.blush,
      COLORS.zzz,
      COLORS.accentLight,
      COLORS.white,
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  private updateZZZ(dt: number): void {
    for (let i = this.zzzContainer.children.length - 1; i >= 0; i--) {
      const child = this.zzzContainer.children[i] as PIXI.Text;
      child.y -= 0.3;
      child.alpha -= 0.003;
      child.x += Math.sin(this.totalTime * 0.008 + i) * 0.2;
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
        fontSize: 12 + Math.random() * 8,
        fill: '#a78bfa',
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
      }),
    });
    z.x = 20 + Math.random() * 20;
    z.y = -30 + Math.random() * 10;
    z.alpha = 0.7;
    this.zzzContainer.addChild(z);
  }

  private updateEmotionIndicator(): void {
    for (const c of this.emotionIndicator.children) {
      c.destroy();
    }
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
      style: new PIXI.TextStyle({ fontSize: 18, fontFamily: 'Arial' }),
    });
    text.x = 25;
    text.y = -50;
    text.alpha = 0.7;
    this.emotionIndicator.addChild(text);
  }

  private render(): void {
    const s = DEFAULT_SCALE;
    const bodyLength = 70 * s;
    const bodyHeight = 28 * s;

    this.snailContainer.x = this.position.x;
    this.snailContainer.y = this.position.y + this.bodyBaseY;

    const flip = this.direction === 'left' ? -1 : 1;
    this.snailContainer.scale.x = flip * this.bodySquash;
    this.snailContainer.scale.y = this.bodyStretch;

    this.bodyMain.scale.x = 1 + this.bodyCompression;
    this.bodyMain.scale.y = 1 - this.bodyCompression * 0.5;
    this.bodyFoot.scale.x = 1 + this.bodyCompression * 0.5;
    this.bodyHighlight.scale.x = 1 + this.bodyCompression * 0.3;

    const tiltAngle = this.headTilt;
    this.shellGroup.x = this.shellLagX;
    this.shellGroup.y = this.shellLagY + this.shellBob;
    this.shellGroup.rotation = this.shellRotate;

    this.eyeStalkLeft.scale.y = this.eyeStalkHeightL;
    this.eyeStalkRight.scale.y = this.eyeStalkHeightR;
    this.eyeStalkLeft.rotation = this.eyeStalkSwayL;
    this.eyeStalkRight.rotation = this.eyeStalkSwayR;

    this.feelerLeft.rotation = this.feelerSwayL;
    this.feelerRight.rotation = this.feelerSwayR;

    this.antennaLeft.rotation = this.feelerSwayL * 0.5;
    this.antennaRight.rotation = this.feelerSwayR * 0.5;

    this.pupilLeft.scale.set(1, this.eyeScaleY);
    this.pupilRight.scale.set(1, this.eyeScaleY);
    this.eyeLeft.scale.set(1, this.eyeScaleY);
    this.eyeRight.scale.set(1, this.eyeScaleY);
    this.eyeHighlightL.scale.set(1, this.eyeScaleY);
    this.eyeHighlightR.scale.set(1, this.eyeScaleY);

    this.pupilLeft.x = this.pupilOffX;
    this.pupilLeft.y = this.pupilOffY;
    this.pupilRight.x = this.pupilOffX;
    this.pupilRight.y = this.pupilOffY;

    this.blushLeft.alpha = this.blushAlpha;
    this.blushRight.alpha = this.blushAlpha;
    this.mouth.alpha = Math.max(0, this.mouthScale);

    this.shadow.alpha = 0.6 + this.bodyCompression * 2;
  }

  public moveTo(x: number, y: number): void {
    const clampedX = this.clamp(x, 20, this.width - 20);
    const clampedY = this.clamp(y, 20, this.height - 20);

    this.targetPos = { x: clampedX, y: clampedY };
    this.isPausedDuringCrawl = false;
    this.crawlPauseTimer = 0;
    this.crawlCycleTimer = 0;

    const dx = clampedX - this.position.x;
    this.direction = dx >= 0 ? 'right' : 'left';
    this.setAnimation('walking');
  }

  public setAnimation(state: AnimationState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateTime = 0;
    this.idleSubTimer = 0;
    this.idleSubState = 'breathing';

    switch (state) {
      case 'sleeping':
        this.eyeScaleY = 0.05;
        this.sleepZZTimer = 0;
        break;
      case 'spawning':
        this.snailContainer.alpha = 0;
        this.snailContainer.scale.set(0.1);
        this.spawnParticles(25, 'sparkle');
        break;
      case 'dancing':
      case 'celebrating':
        this.celebrationTimer = 0;
        this.celebrationPhase = 0;
        this.spawnParticles(18, 'confetti');
        break;
      case 'hiding':
        this.spawnParticles(12, 'sparkle');
        break;
      case 'eating':
        this.drawFood();
        this.spawnParticles(5, 'sparkle');
        break;
      case 'petting':
        this.petReactionPhase = 0;
        this.petReactionTimer = 0;
        this.drawPetHand();
        break;
      case 'idle':
      case 'happy':
        this.eyeScaleY = this.lerp(this.eyeScaleY, 1, 0.3);
        this.snailContainer.alpha = this.lerp(this.snailContainer.alpha, 1, 0.3);
        this.snailContainer.scale.set(1);
        this.targetPos = null;
        this.velocity = { x: 0, y: 0 };
        break;
    }
  }

  public setEmotion(emotion: EmotionalState): void {
    this.currentEmotion = emotion;
    this.drawMouth();
    this.drawBlush();
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
    setTimeout(() => {
      if (this.currentState === 'waving') {
        this.setAnimation('idle');
      }
    }, 1500);
  }

  public danceAnimation(): void {
    this.setAnimation('dancing');
    this.setEmotion('excited');
    this.spawnParticles(20, 'confetti');
    setTimeout(() => {
      if (this.currentState === 'dancing') {
        this.setAnimation('idle');
        this.setEmotion('happy');
      }
    }, 3000);
  }

  public celebrateAnimation(): void {
    this.setAnimation('celebrating');
    this.setEmotion('celebrating');
    this.spawnParticles(35, 'confetti');
  }

  public spawnAnimation(): void {
    this.snailContainer.alpha = 0;
    this.snailContainer.scale.set(0.1);
    this.container.alpha = 1;
    this.spawnParticles(30, 'sparkle');
    this.currentState = 'spawning';
    this.stateTime = 0;

    const startTime = Date.now();
    const animDuration = 1000;

    const animStep = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / animDuration, 1);
      const eased = this.easeOutBack(t);

      this.snailContainer.alpha = eased;
      this.snailContainer.scale.set(0.1 + eased * 0.9);

      if (t < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.snailContainer.alpha = 1;
        this.snailContainer.scale.set(1);
        this.setAnimation('idle');
      }
    };

    requestAnimationFrame(animStep);
  }

  public hideAnimation(onComplete: () => void): void {
    this.setAnimation('hiding');
    this.spawnParticles(16, 'sparkle');

    const startTime = Date.now();
    const animDuration = 500;

    const animStep = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / animDuration, 1);
      const eased = Math.pow(t, 3);

      this.snailContainer.alpha = 1 - eased;
      this.snailContainer.scale.set(1 - eased * 0.6);

      if (t < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.snailContainer.alpha = 0;
        onComplete();
      }
    };

    requestAnimationFrame(animStep);
  }

  public lookAt(mouseX: number, mouseY: number): void {
    const dx = mouseX - this.position.x;
    const dy = mouseY - this.position.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      this.direction = dx >= 0 ? 'right' : 'left';
    }
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.mouseOver = true;
  }

  public setMouseOver(over: boolean): void {
    this.mouseOver = over;
    if (!over) {
      this.eyeTargetX = 0;
      this.eyeTargetY = 0;
    }
  }

  public teleportTo(x: number, y: number): void {
    this.position.x = this.clamp(x, 0, this.width);
    this.position.y = this.clamp(y, 0, this.height);
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public getState(): AnimationState {
    return this.currentState;
  }

  public getDirection(): Direction {
    return this.direction;
  }

  public setSkin(skin: string): void {
    const colors = SKINS[skin] || SKINS.classic;
    this.skinColor = colors.body;
    this.skinColorLight = colors.bodyLight;
    this.skinColorDark = colors.bodyDark;
    this.shellColor = colors.shell;
    this.shellColorDark = colors.shellDark;
    this.shellColorLight = colors.shellLight;
    this.drawSnail();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.app.renderer.resize(width, height);
  }

  public destroy(): void {
    this.particles = [];
    this.trailPoints = [];
    this.app.destroy(true);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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
