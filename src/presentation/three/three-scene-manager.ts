/**
 * 《孤城神机营》- Three.js 3D Scene Manager
 * Integrates real-time 3D WebGL rendering with Phaser 2D game loop:
 * - 750x1334 transparent overlay canvas with PBR directional & blood-moon lighting
 * - Direct screen-to-3D pixel coordinate projection
 * - Synchronized weapon war engines and invading enemy units
 * - Smooth weapon recoil & enemy march animations
 */

import * as THREE from 'three';
import { WeaponInstance, EnemyEntity } from '../../core/types';
import { WeaponModelFactory } from './models/weapon-models';
import { EnemyModelFactory } from './models/enemy-models';

export type RenderMode = '2d' | '3d';

export class ThreeSceneManager {
  private static instance: ThreeSceneManager | null = null;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderMode: RenderMode = '2d';
  private isModalHidden = false;

  // Tracked 3D objects
  private weaponObjects = new Map<string, THREE.Group>();
  private weaponBasePositions = new Map<string, { x: number; y: number; z: number }>();
  private enemyObjects = new Map<string, THREE.Group>();
  private recoilTweens = new Map<string, { current: number; duration: number }>();

  private clock = new THREE.Clock();
  private isInitialized = false;

  public static getInstance(): ThreeSceneManager {
    if (!ThreeSceneManager.instance) {
      ThreeSceneManager.instance = new ThreeSceneManager();
    }
    return ThreeSceneManager.instance;
  }

  private constructor() {
    this.scene = new THREE.Scene();

    // 1:1 Pixel Mapping Orthographic Camera (Left=0, Right=750, Top=0, Bottom=1334)
    this.camera = new THREE.OrthographicCamera(0, 750, 0, 1334, -2000, 2000);
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);

    this.renderMode = this.getSavedRenderMode();
    this.setupLighting();
  }

  /**
   * Reads saved render mode from localStorage safely, defaulting to '2d'.
   */
  private getSavedRenderMode(): RenderMode {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ddg_render_mode');
        if (saved === '2d' || saved === '3d') {
          return saved;
        }
      }
    } catch {
      // Fallback on storage errors
    }
    return '2d';
  }

  /**
   * Persists render mode to localStorage safely.
   */
  private saveRenderMode(mode: RenderMode): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('ddg_render_mode', mode);
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Gets current active render mode ('2d' or '3d').
   */
  public getRenderMode(): RenderMode {
    return this.renderMode;
  }

  /**
   * Sets the render mode explicitly and manages 3D canvas visibility.
   */
  public setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
    this.saveRenderMode(mode);

    if (this.canvas) {
      if (mode === '3d' && !this.isModalHidden) {
        this.canvas.style.display = 'block';
        this.syncWithPhaser();
      } else {
        this.canvas.style.display = 'none';
      }
    }
  }

  /**
   * Toggles between 2D and 3D render mode.
   */
  public toggleRenderMode(): RenderMode {
    const nextMode: RenderMode = this.renderMode === '2d' ? '3d' : '2d';
    this.setRenderMode(nextMode);
    return nextMode;
  }

  /**
   * Synchronizes the 3D WebGL overlay canvas with the Phaser 2D canvas size and offset.
   * Ensures pixel-perfect alignment between Phaser screen coordinates and Three.js 3D meshes.
   */
  public syncWithPhaser(phaserCanvas?: HTMLCanvasElement): void {
    if (!this.canvas || typeof window === 'undefined') return;

    const targetCanvas = phaserCanvas || (document.querySelector('#game-container canvas:not(#three-canvas)') as HTMLCanvasElement) || (document.querySelector('canvas:not(#three-canvas)') as HTMLCanvasElement);
    if (!targetCanvas) return;

    const parent = this.canvas.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const targetRect = targetCanvas.getBoundingClientRect();

    const left = Math.round(targetRect.left - parentRect.left);
    const top = Math.round(targetRect.top - parentRect.top);
    const width = Math.round(targetRect.width);
    const height = Math.round(targetRect.height);

    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.style.margin = '0';
    this.canvas.style.padding = '0';
    this.canvas.style.border = 'none';
    this.canvas.style.transform = 'none';

    if (this.renderer) {
      this.renderer.setSize(750, 1334, false);
    }
  }

  /**
   * Initializes WebGLRenderer onto the #game-container DOM element.
   */
  public init(container?: HTMLElement | null): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    const parent = container || document.getElementById('game-container') || document.body;

    // Check if canvas already exists
    let canvas = parent.querySelector('#three-canvas') as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'three-canvas';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none'; // Allow all touch inputs to pass through to Phaser
      canvas.style.zIndex = '5'; // Above Phaser ground graphics, below top HUD modals
      parent.appendChild(canvas);
    }

    this.canvas = canvas;
    // Set initial canvas visibility according to stored render mode
    this.canvas.style.display = this.renderMode === '3d' ? 'block' : 'none';

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(750, 1334, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.isInitialized = true;
    console.log(`[ThreeSceneManager] Three.js 3D WebGL Pipeline initialized (mode: ${this.renderMode}, 750x1334).`);
  }

  /**
   * Sets up atmospheric lighting matching the Chinese ink-wash blood-moon fortress.
   */
  private setupLighting(): void {
    // 1. Ambient Moonlight
    const ambient = new THREE.AmbientLight(0x5a6878, 1.2);
    this.scene.add(ambient);

    // 2. Ominous Crimson Blood-Moon Light from Top-Right
    const bloodMoonLight = new THREE.DirectionalLight(0xff6644, 2.2);
    bloodMoonLight.position.set(650, 80, 450);
    bloodMoonLight.target.position.set(375, 700, 0);
    bloodMoonLight.castShadow = true;
    bloodMoonLight.shadow.mapSize.width = 1024;
    bloodMoonLight.shadow.mapSize.height = 1024;
    bloodMoonLight.shadow.camera.near = 10;
    bloodMoonLight.shadow.camera.far = 1000;
    this.scene.add(bloodMoonLight);
    this.scene.add(bloodMoonLight.target);

    // 3. Cool Slate-Blue Fill Light from Left Battlements
    const fillLight = new THREE.DirectionalLight(0x7890a8, 1.0);
    fillLight.position.set(50, 400, 300);
    fillLight.target.position.set(375, 700, 0);
    this.scene.add(fillLight);
    this.scene.add(fillLight.target);

    // 4. Warm Torches on City Wall Gatehouse
    const torchLight = new THREE.PointLight(0xffaa33, 1.8, 600);
    torchLight.position.set(375, 450, 120);
    this.scene.add(torchLight);
  }

  /**
   * Adds or updates a 3D weapon entity at specified screen coordinates.
   * Renders the authentic 3D procedural war engine model layered directly on the battlements grid.
   */
  public addOrUpdateWeapon(weapon: WeaponInstance, screenX: number, screenY: number, perspectiveScale: number = 1.0): void {
    let group = this.weaponObjects.get(weapon.id);

    if (!group) {
      group = WeaponModelFactory.createWeaponMesh(weapon);
      this.weaponObjects.set(weapon.id, group);
      this.scene.add(group);
    }

    const starScale = 1.0 + (weapon.star - 1) * 0.12;
    const finalScale = starScale * perspectiveScale;
    group.scale.set(finalScale, finalScale, finalScale);

    this.weaponBasePositions.set(weapon.id, { x: screenX, y: screenY, z: 20 });
    group.position.set(screenX, screenY, 20);
  }

  /**
   * Triggers firing recoil animation for a weapon.
   */
  public playWeaponRecoil(weaponId: string): void {
    this.recoilTweens.set(weaponId, { current: 0, duration: 0.15 });
  }

  /**
   * Removes weapon 3D entity.
   */
  public removeWeapon(weaponId: string): void {
    const group = this.weaponObjects.get(weaponId);
    if (group) {
      this.scene.remove(group);
      this.weaponObjects.delete(weaponId);
      this.weaponBasePositions.delete(weaponId);
      this.recoilTweens.delete(weaponId);
    }
  }

  /**
   * Adds or updates an invading 3D enemy entity at screen coordinates.
   */
  public addOrUpdateEnemy(enemy: EnemyEntity, screenX: number, screenY: number): void {
    let group = this.enemyObjects.get(enemy.id);

    if (!group) {
      group = EnemyModelFactory.createEnemyMesh(enemy);
      this.enemyObjects.set(enemy.id, group);
      this.scene.add(group);
    }

    // Walking stride bobbing animation
    const time = this.clock.getElapsedTime();
    const strideOffset = Math.sin(time * 8.0 + Number(enemy.id.slice(-2) || 0)) * 2.5;

    group.position.set(screenX, screenY, 15);
    group.position.z = 15 + strideOffset;
  }

  /**
   * Removes enemy 3D entity.
   */
  public removeEnemy(enemyId: string): void {
    const group = this.enemyObjects.get(enemyId);
    if (group) {
      this.scene.remove(group);
      this.enemyObjects.delete(enemyId);
    }
  }

  /**
   * Clears all entities (e.g. on scene restart).
   */
  public clearAll(): void {
    for (const group of this.weaponObjects.values()) {
      this.scene.remove(group);
    }
    this.weaponObjects.clear();
    this.weaponBasePositions.clear();

    for (const group of this.enemyObjects.values()) {
      this.scene.remove(group);
    }
    this.enemyObjects.clear();
    this.recoilTweens.clear();
  }

  /**
   * Renders the 3D scene (called once per frame from Phaser's update loop).
   * Early-returns in 2D mode to consume zero GPU draw calls and zero overhead.
   */
  public render(deltaSec: number): void {
    if (!this.renderer || !this.isInitialized || this.renderMode === '2d') return;

    // Update recoil animations: smoothly push backwards along barrel and return to base position
    for (const [id, tween] of this.recoilTweens.entries()) {
      tween.current += deltaSec;
      const progress = tween.current / tween.duration;
      const group = this.weaponObjects.get(id);
      const base = this.weaponBasePositions.get(id);

      if (group && base) {
        if (progress < 1.0) {
          // Subtle recoil kickback upwards (away from battlefield)
          const recoilOffset = Math.sin(progress * Math.PI) * 4.0;
          group.position.set(base.x, base.y - recoilOffset, base.z);
        } else {
          group.position.set(base.x, base.y, base.z);
          this.recoilTweens.delete(id);
        }
      } else {
        this.recoilTweens.delete(id);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Toggles visibility of the 3D WebGL overlay canvas (e.g. hide when modals are open).
   * Strictly respects the active RenderMode (remains hidden in 2D mode).
   */
  public setVisible(visible: boolean): void {
    this.isModalHidden = !visible;
    if (this.canvas) {
      if (this.renderMode === '3d' && visible) {
        this.canvas.style.display = 'block';
        this.syncWithPhaser();
      } else {
        this.canvas.style.display = 'none';
      }
    }
  }

  /**
   * Cleanly destroys WebGL context.
   */
  public destroy(): void {
    this.clearAll();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
    }
    this.isInitialized = false;
  }
}
