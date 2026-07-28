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
}

interface DreamParticle extends Particle {
  rotation: number;
  rotationSpeed: number;
}

export class SnailEngine {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private snailBody: PIXI.Container;
  private shell: PIXI.Graphics;
  private body: PIXI.Graphics;
  private eyeLeft: PIXI.Graphics;
  private eyeRight: PIXI.Graphics;
  private eyeLeftPupil: PIXI.Graphics;
  private eyeRightPupil: PIXI.Graphics;
  private mouth: PIXI.Graphics;
  private feelerLeft: PIXI.Graphics;
  private feelerRight: PIXI.Graphics;
  private trail: PIXI.Graphics;
  private particles: DreamParticle[] = [];
  private zzzContainer: PIXI.Container;
  private emotionIndicator: PIXI.Container;

  private currentState: AnimationState = 'idle';
  private currentEmotion: EmotionalState = 'happy';
  private targetPosition: Position;
  private direction: Direction = 'right';
  private edge: Edge = 'bottom';
  private moveProgress = 0;
  private moveDuration = 0;
  private moveStartPos: Position = { x: 0, y: 0 };
  private moveEndPos: Position = { x: 0, y: 0 };
  private tickCount = 0;
  private trailPoints: Position[] = [];
  private idleTimer = 0;
  private blinkTimer = 0;

  private skinColor = 0x4ade80;
  private shellColor = 0x86efac;
  private shellDarkColor = 0x22c55e;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.app = new PIXI.Application();
    this.container = new PIXI.Container();
    this.snailBody = new PIXI.Container();
    this.shell = new PIXI.Graphics();
    this.body = new PIXI.Graphics();
    this.eyeLeft = new PIXI.Graphics();
    this.eyeRight = new PIXI.Graphics();
    this.eyeLeftPupil = new PIXI.Graphics();
    this.eyeRightPupil = new PIXI.Graphics();
    this.mouth = new PIXI.Graphics();
    this.feelerLeft = new PIXI.Graphics();
    this.feelerRight = new PIXI.Graphics();
    this.trail = new PIXI.Graphics();
    this.zzzContainer = new PIXI.Container();
    this.emotionIndicator = new PIXI.Container();

    this.targetPosition = { x: width / 2, y: height / 2 };
    this.moveStartPos = { x: width / 2, y: height / 2 };
    this.moveEndPos = { x: width / 2, y: height / 2 };

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
    this.snailBody.zIndex = 10;
    this.zzzContainer.zIndex = 20;
    this.emotionIndicator.zIndex = 15;

    this.container.addChild(this.trail);
    this.container.addChild(this.snailBody);
    this.container.addChild(this.zzzContainer);
    this.container.addChild(this.emotionIndicator);

    this.snailBody.addChild(this.shell);
    this.snailBody.addChild(this.body);
    this.snailBody.addChild(this.feelerLeft);
    this.snailBody.addChild(this.feelerRight);
    this.snailBody.addChild(this.eyeLeft);
    this.snailBody.addChild(this.eyeRight);
    this.snailBody.addChild(this.eyeLeftPupil);
    this.snailBody.addChild(this.eyeRightPupil);
    this.snailBody.addChild(this.mouth);

    this.app.stage.addChild(this.container);
    this.app.ticker.add(() => this.update());

    this.drawSnail();
  }

  private drawSnail(): void {
    const scale = 0.8;

    // Body (foot)
    this.body.clear();
    this.body.beginFill(this.skinColor);
    this.body.ellipse(0, 15, 35 * scale, 10 * scale);
    this.body.endFill();

    // Shell
    this.shell.clear();
    this.shell.beginFill(this.shellColor);
    this.shell.circle(-5 * scale, -15 * scale, 25 * scale);
    this.shell.endFill();

    // Shell spiral detail
    this.shell.lineStyle(1.5 * scale, this.shellDarkColor, 0.5);
    this.shell.arc(-5 * scale, -15 * scale, 12 * scale, 0, Math.PI * 2);
    this.shell.arc(-3 * scale, -12 * scale, 6 * scale, 0, Math.PI * 1.5);

    // Eyes (on stalks)
    const eyeY = -35 * scale;
    const eyeLX = 10 * scale;
    const eyeRX = 22 * scale;

    // Eye stalks
    this.eyeLeft.clear();
    this.eyeLeft.lineStyle(2 * scale, this.skinColor);
    this.eyeLeft.moveTo(5 * scale, -5 * scale);
    this.eyeLeft.lineTo(eyeLX, eyeY);

    this.eyeRight.clear();
    this.eyeRight.lineStyle(2 * scale, this.skinColor);
    this.eyeRight.moveTo(15 * scale, -5 * scale);
    this.eyeRight.lineTo(eyeRX, eyeY);

    // Eyeballs
    this.eyeLeft.beginFill(0xffffff);
    this.eyeLeft.circle(eyeLX, eyeY, 6 * scale);
    this.eyeLeft.endFill();

    this.eyeRight.beginFill(0xffffff);
    this.eyeRight.circle(eyeRX, eyeY, 6 * scale);
    this.eyeRight.endFill();

    // Pupils
    this.eyeLeftPupil.clear();
    this.eyeLeftPupil.beginFill(0x1a1a2e);
    this.eyeLeftPupil.circle(eyeLX + 2 * scale, eyeY, 3 * scale);
    this.eyeLeftPupil.endFill();

    this.eyeRightPupil.clear();
    this.eyeRightPupil.beginFill(0x1a1a2e);
    this.eyeRightPupil.circle(eyeRX + 2 * scale, eyeY, 3 * scale);
    this.eyeRightPupil.endFill();

    // Feelers (antennae)
    this.feelerLeft.clear();
    this.feelerLeft.lineStyle(1.5 * scale, this.skinColor, 0.7);
    this.feelerLeft.moveTo(8 * scale, -8 * scale);
    this.feelerLeft.bezierCurveTo(
      8 * scale, -25 * scale,
      -5 * scale, -30 * scale,
      -2 * scale, -22 * scale
    );

    this.feelerRight.clear();
    this.feelerRight.lineStyle(1.5 * scale, this.skinColor, 0.7);
    this.feelerRight.moveTo(12 * scale, -8 * scale);
    this.feelerRight.bezierCurveTo(
      12 * scale, -25 * scale,
      25 * scale, -30 * scale,
      22 * scale, -22 * scale
    );

    // Mouth
    this.mouth.clear();
    this.mouth.lineStyle(1.5 * scale, 0x166534);
    const mouthY = 5 * scale;
    const mouthX = 12 * scale;
    this.mouth.arc(mouthX, mouthY, 3 * scale, 0.1, Math.PI - 0.1);
  }

  private update(): void {
    this.tickCount++;

    if (this.currentState === 'walking') {
      this.updateWalking();
    } else if (this.currentState === 'idle') {
      this.updateIdle();
    } else if (this.currentState === 'sleeping') {
      this.updateSleeping();
    }

    this.updateTrail();
    this.updateParticles();
    this.updateBlink();
    this.updateEmotionIndicator();

    if (this.currentState === 'sleeping') {
      this.updateZZZ();
    }
  }

  private updateWalking(): void {
    this.moveProgress += this.app.ticker.deltaMS / this.moveDuration;
    if (this.moveProgress >= 1) {
      this.moveProgress = 0;
      this.setAnimation('idle');
      Object.assign(this.targetPosition, this.moveEndPos);
      return;
    }

    const t = this.easeInOutCubic(this.moveProgress);
    const wobble = Math.sin(this.tickCount * 0.15) * 3;

    const x = this.moveStartPos.x + (this.moveEndPos.x - this.moveStartPos.x) * t;
    const y = this.moveStartPos.y + (this.moveEndPos.y - this.moveStartPos.y) * t + wobble;

    this.targetPosition = { x, y };
  }

  private updateIdle(): void {
    this.idleTimer += this.app.ticker.deltaMS;

    const breathe = Math.sin(this.tickCount * 0.02) * 2;
    const swayAmount = Math.sin(this.tickCount * 0.015 + 1) * 1.5;

    this.snailBody.y = breathe;
    this.snailBody.rotation = swayAmount * (Math.PI / 180);

    // Gentle feeler sway
    this.feelerLeft.rotation = Math.sin(this.tickCount * 0.03) * 0.1;
    this.feelerRight.rotation = Math.sin(this.tickCount * 0.03 + 0.5) * 0.1;

    if (this.idleTimer > 30000 && this.currentState === 'idle') {
      this.setAnimation('sleeping');
    }
  }

  private updateSleeping(): void {
    const breathe = Math.sin(this.tickCount * 0.01) * 3;
    this.snailBody.y = breathe;

    this.mouth.alpha = 0;

    const eyeScale = 0.3 + Math.sin(this.tickCount * 0.02) * 0.05;
    this.eyeLeftPupil.scale.set(1, eyeScale);
    this.eyeRightPupil.scale.set(1, eyeScale);

    if (this.tickCount % 120 < 2) {
      this.addZZZ();
    }
  }

  private updateTrail(): void {
    if (this.currentState !== 'walking') return;

    if (this.tickCount % 4 === 0) {
      this.trailPoints.push({ ...this.targetPosition });
      if (this.trailPoints.length > 30) {
        this.trailPoints.shift();
      }
    }

    this.trail.clear();
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      const alpha = (i / this.trailPoints.length) * 0.15;
      const width = 3 * (i / this.trailPoints.length);
      this.trail.lineStyle(width, 0x4ade80, alpha);
      this.trail.moveTo(this.trailPoints[i].x, this.trailPoints[i].y + 15);
      this.trail.lineTo(this.trailPoints[i + 1].x, this.trailPoints[i + 1].y + 15);
    }
  }

  private updateBlink(): void {
    this.blinkTimer += this.app.ticker.deltaMS;

    if (this.blinkTimer > 3000 + Math.random() * 4000) {
      this.blinkTimer = 0;
      this.blink();
    }
  }

  private blink(): void {
    const blinkAnim = () => {
      this.eyeLeft.scale.set(1, 0.1);
      this.eyeRight.scale.set(1, 0.1);
      this.eyeLeftPupil.scale.set(1, 0);
      this.eyeRightPupil.scale.set(1, 0);

      setTimeout(() => {
        this.eyeLeft.scale.set(1, 1);
        this.eyeRight.scale.set(1, 1);
        if (this.currentState !== 'sleeping') {
          this.eyeLeftPupil.scale.set(1, 1);
          this.eyeRightPupil.scale.set(1, 1);
        }
      }, 150);
    };

    blinkAnim();
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.alpha = p.life / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles(): void {
    const g = new PIXI.Graphics();
    g.zIndex = 5;
    this.container.addChild(g);

    // Render and cleanup particles in this frame
    for (const p of this.particles) {
      g.beginFill(p.color, p.alpha);
      g.drawCircle(p.x, p.y, p.size);
      g.endFill();
    }

    setTimeout(() => {
      this.container.removeChild(g);
      g.destroy();
    }, 100);
  }

  private updateZZZ(): void {
    // ZZZ letters float upward
    const children = this.zzzContainer.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i] as PIXI.Text;
      child.y -= 0.5;
      child.alpha -= 0.005;
      child.scale.set(child.scale.x + 0.002);

      if (child.alpha <= 0) {
        this.zzzContainer.removeChild(child);
        child.destroy();
      }
    }
  }

  private addZZZ(): void {
    const z = new PIXI.Text({
      text: 'z',
      style: new PIXI.TextStyle({
        fontSize: 16 + Math.random() * 8,
        fill: 0x4ade80,
        fontFamily: 'Arial',
        fontWeight: 'bold',
      }),
    });

    z.x = 30 + Math.random() * 20;
    z.y = -40 + Math.random() * 10;
    z.alpha = 0.8;

    this.zzzContainer.addChild(z);

    setTimeout(() => {
      if (this.zzzContainer.children.includes(z)) {
        this.zzzContainer.removeChild(z);
        z.destroy();
      }
    }, 3000);
  }

  private updateEmotionIndicator(): void {
    this.emotionIndicator.children.forEach(c => c.destroy());
    this.emotionIndicator.removeChildren();

    const emoji = this.getEmotionEmoji();
    if (!emoji) return;

    const text = new PIXI.Text({
      text: emoji,
      style: new PIXI.TextStyle({
        fontSize: 20,
        fontFamily: 'Arial',
      }),
    });

    text.x = 35;
    text.y = -40;
    text.alpha = 0.7;

    this.emotionIndicator.addChild(text);
  }

  private getEmotionEmoji(): string {
    switch (this.currentEmotion) {
      case 'happy': return '';
      case 'curious': return '';
      case 'excited': return '';
      case 'thinking': return '';
      case 'confused': return '';
      case 'celebrating': return '';
      case 'sleepy': return '';
      case 'listening': return '';
      default: return '';
    }
  }

  private renderSnail(): void {
    const { x, y } = this.targetPosition;
    this.snailBody.x = x;
    this.snailBody.y = y;

    const flip = this.direction === 'left';
    this.snailBody.scale.x = flip ? -1 : 1;

    if (this.currentState === 'climbing') {
      this.snailBody.rotation = this.edge === 'left'
        ? -Math.PI / 2
        : this.edge === 'right'
          ? Math.PI / 2
          : this.edge === 'top'
            ? Math.PI
            : 0;
    } else {
      this.snailBody.rotation = 0;
    }

    this.renderParticles();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // --- Public API ---

  setAnimation(state: AnimationState): void {
    if (this.currentState === state) return;

    this.currentState = state;
    this.idleTimer = 0;

    if (state === 'sleeping') {
      this.mouth.alpha = 0;
      this.shell.alpha = this.shell.alpha;
    } else if (this.currentState !== 'sleeping') {
      this.mouth.alpha = 1;
      this.eyeLeftPupil.scale.set(1, 1);
      this.eyeRightPupil.scale.set(1, 1);
    }

    if (state === 'dancing' || state === 'celebrating') {
      this.spawnParticles(20);
    }
  }

  setEmotion(emotion: EmotionalState): void {
    this.currentEmotion = emotion;

    // Adjust mouth based on emotion
    this.mouth.clear();
    this.mouth.lineStyle(1.5, 0x166534);

    const scale = 0.8;
    if (emotion === 'happy' || emotion === 'excited' || emotion === 'celebrating') {
      this.mouth.arc(12 * scale, 5 * scale, 5 * scale, 0.1, Math.PI - 0.1);
    } else if (emotion === 'confused' || emotion === 'thinking') {
      this.mouth.moveTo(8 * scale, 8 * scale);
      this.mouth.lineTo(16 * scale, 8 * scale);
    } else if (emotion === 'surprised') {
      this.mouth.circle(12 * scale, 5 * scale, 4 * scale);
    } else {
      this.mouth.arc(12 * scale, 5 * scale, 3 * scale, 0.1, Math.PI - 0.1);
    }
  }

  moveTo(x: number, y: number, duration = 2000): void {
    this.moveStartPos = { ...this.targetPosition };
    this.moveEndPos = { x, y };
    this.moveProgress = 0;
    this.moveDuration = duration;

    const dx = x - this.targetPosition.x;
    this.direction = dx >= 0 ? 'right' : 'left';

    this.setAnimation('walking');
  }

  moveToEdge(edge: Edge, progress: number): void {
    this.edge = edge;
    this.setAnimation('climbing');
  }

  teleportTo(x: number, y: number): void {
    this.targetPosition = { x, y };
    this.moveStartPos = { x, y };
    this.moveEndPos = { x, y };
  }

  lookAt(mouseX: number, mouseY: number): void {
    const dx = mouseX - this.targetPosition.x;
    const dy = mouseY - this.targetPosition.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx >= 0 ? 'right' : 'left';
    }
  }

  spawnAnimation(): void {
    this.snailBody.alpha = 0;
    this.snailBody.scale.set(0.1);
    this.container.alpha = 1;

    this.spawnParticles(30);

    const startTime = Date.now();
    const animDuration = 800;

    const animStep = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / animDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.snailBody.alpha = eased;
      this.snailBody.scale.set(0.1 + eased * 0.9);

      if (t < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.snailBody.alpha = 1;
        this.snailBody.scale.set(1);
        this.setAnimation('idle');
      }
    };

    requestAnimationFrame(animStep);
  }

  hideAnimation(onComplete: () => void): void {
    this.setAnimation('waving');
    this.spawnParticles(20);

    const startTime = Date.now();
    const animDuration = 600;

    const animStep = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / animDuration, 1);
      const eased = Math.pow(t, 3);

      this.snailBody.alpha = 1 - eased;
      this.snailBody.scale.set(1 - eased * 0.5);

      if (t < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.snailBody.alpha = 0;
        onComplete();
      }
    };

    requestAnimationFrame(animStep);
  }

  celebrateAnimation(): void {
    this.setAnimation('celebrating');
    this.setEmotion('celebrating');
    this.spawnParticles(30);

    const bounce = () => {
      const jump = Math.sin(Date.now() * 0.01) * 15;
      this.snailBody.y = this.targetPosition.y + jump;
    };

    const startTime = Date.now();
    const interval = setInterval(bounce, 16);

    setTimeout(() => {
      clearInterval(interval);
      this.setAnimation('idle');
      this.setEmotion('happy');
    }, 2000);
  }

  waveAnimation(): void {
    this.setAnimation('waving');

    const wave = () => {
      this.snailBody.rotation = Math.sin(Date.now() * 0.008) * 0.3;
    };

    const startTime = Date.now();
    const interval = setInterval(wave, 16);

    setTimeout(() => {
      clearInterval(interval);
      this.snailBody.rotation = 0;
      this.setAnimation('idle');
    }, 1500);
  }

  danceAnimation(): void {
    this.setAnimation('dancing');
    this.setEmotion('excited');

    const dance = () => {
      const t = Date.now() * 0.005;
      const bounceY = Math.abs(Math.sin(t * 2)) * 12;
      const sway = Math.sin(t) * 0.2;

      this.snailBody.y = this.targetPosition.y + bounceY;
      this.snailBody.rotation = sway;
    };

    const startTime = Date.now();
    const interval = setInterval(dance, 16);

    setTimeout(() => {
      clearInterval(interval);
      this.snailBody.y = this.targetPosition.y;
      this.snailBody.rotation = 0;
      this.setAnimation('idle');
      this.setEmotion('happy');
    }, 2500);
  }

  private spawnParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push({
        x: this.targetPosition.x,
        y: this.targetPosition.y - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 40 + Math.random() * 40,
        maxLife: 80,
        size: 2 + Math.random() * 4,
        color: this.getRandomSnailColor(),
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      });
    }
  }

  private getRandomSnailColor(): number {
    const colors = [0x4ade80, 0x86efac, 0xa78bfa, 0x60a5fa, 0xfbbf24, 0xf472b6, 0x34d399];
    return colors[Math.floor(Math.random() * colors.length)];
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
    return { ...this.targetPosition };
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
