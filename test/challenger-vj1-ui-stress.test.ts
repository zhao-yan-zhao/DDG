import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// Mock Phaser GameObject & Tween Infrastructure for Presentation Testing
// =========================================================================
vi.mock('phaser', () => {
  class MockGameObject {
    scene: any;
    x: number;
    y: number;
    width: number = 0;
    height: number = 0;
    visible: boolean = true;
    alpha: number = 1.0;
    active: boolean = true;
    isDestroyed: boolean = false;
    depth: number = 0;
    scaleX: number = 1.0;
    scaleY: number = 1.0;
    angle: number = 0;
    listeners: Record<string, Function[]> = {};

    constructor(scene: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    setSize(w: number, h: number) {
      this.width = w;
      this.height = h;
      return this;
    }

    setInteractive() {
      return this;
    }

    setScale(s: number) {
      this.scaleX = s;
      this.scaleY = s;
      return this;
    }

    setAngle(deg: number) {
      this.angle = deg;
      return this;
    }

    setDepth(d: number) {
      this.depth = d;
      return this;
    }

    on(event: string, fn: Function) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
      return this;
    }

    emit(event: string, ...args: any[]) {
      if (this.isDestroyed) return;
      const fns = this.listeners[event] || [];
      for (const fn of fns) fn(...args);
    }

    setAlpha(a: number) {
      this.alpha = a;
      return this;
    }

    setVisible(v: boolean) {
      this.visible = v;
      return this;
    }

    destroy() {
      this.isDestroyed = true;
      this.active = false;
      this.listeners = {};
    }
  }

  class MockContainer extends MockGameObject {
    children: any[] = [];
    add(child: any) {
      if (Array.isArray(child)) this.children.push(...child);
      else this.children.push(child);
      return this;
    }
  }

  return {
    default: {
      GameObjects: {
        Container: MockContainer,
        GameObject: MockGameObject
      }
    }
  };
});

import { BronzeButton } from '../src/presentation/ui/bronze-button';
import { VermilionStamp, VermilionStampOptions } from '../src/presentation/ui/vermilion-stamp';
import { UITextureFactory } from '../src/presentation/textures/ui-texture-factory';
import { UI_COLORS, UI_TEXTURE_KEYS, NINESLICE_PRESETS } from '../src/presentation/ui/ui-theme';

// =========================================================================
// Test Suite: M_VJ1 Visual Juice & UI Adversarial Challenge
// =========================================================================
describe('Milestone M_VJ1 UI Adversarial Stress & Forensic Challenge', () => {

  // =========================================================================
  // 1. UITextureFactory.generateAll() Edge Cases
  // =========================================================================
  describe('1. UITextureFactory.generateAll() Re-entrancy & Edge Cases', () => {
    let textureRegistry: Map<string, any>;
    let mockScene: any;

    beforeEach(() => {
      textureRegistry = new Map();
      mockScene = {
        textures: {
          exists: vi.fn((key: string) => textureRegistry.has(key)),
          createCanvas: vi.fn((key: string, w: number, h: number) => {
            const entry = {
              key,
              width: w,
              height: h,
              context: {
                createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
                createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                clearRect: vi.fn(),
                beginPath: vi.fn(),
                closePath: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                save: vi.fn(),
                restore: vi.fn(),
                translate: vi.fn(),
                scale: vi.fn(),
                rotate: vi.fn(),
                clip: vi.fn(),
                fillText: vi.fn(),
                set strokeStyle(_v: any) {},
                set fillStyle(_v: any) {},
                set lineWidth(_v: any) {},
                set font(_v: any) {},
                set textAlign(_v: any) {},
                set textBaseline(_v: any) {}
              },
              refresh: vi.fn()
            };
            textureRegistry.set(key, entry);
            return entry;
          })
        }
      };
    });

    it('handles 100 consecutive generateAll() calls with strictly zero duplicate allocations', () => {
      const totalKeys = Object.values(UI_TEXTURE_KEYS).length;
      UITextureFactory.generateAll(mockScene);
      const initialCallCount = mockScene.textures.createCanvas.mock.calls.length;
      expect(initialCallCount).toBe(totalKeys);
      expect(textureRegistry.size).toBe(totalKeys);

      // Repeat 99 more times
      for (let i = 0; i < 99; i++) {
        UITextureFactory.generateAll(mockScene);
      }

      expect(mockScene.textures.createCanvas.mock.calls.length).toBe(totalKeys);
      expect(textureRegistry.size).toBe(totalKeys);
    });

    it('correctly creates ONLY missing textures when partial textures already exist', () => {
      const totalKeys = Object.values(UI_TEXTURE_KEYS).length;
      // Pre-populate 5 keys
      const preExistingKeys = [
        UI_TEXTURE_KEYS.PANEL_XUAN_BRONZE,
        UI_TEXTURE_KEYS.ICON_COIN_TONGBAO,
        UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL,
        UI_TEXTURE_KEYS.STAMP_DAJIE,
        UI_TEXTURE_KEYS.STAMP_WANG_SHOUREN
      ];
      for (const k of preExistingKeys) {
        textureRegistry.set(k, { key: k });
      }
      expect(textureRegistry.size).toBe(5);

      UITextureFactory.generateAll(mockScene);

      // Total textures should now be totalKeys
      expect(textureRegistry.size).toBe(totalKeys);
      // Only totalKeys - 5 new textures should have been created
      expect(mockScene.textures.createCanvas.mock.calls.length).toBe(totalKeys - 5);

      // Verify none of the pre-existing keys were overwritten
      for (const k of preExistingKeys) {
        expect(mockScene.textures.createCanvas).not.toHaveBeenCalledWith(k, expect.anything(), expect.anything());
      }
    });

    it('handles failure when scene.textures.createCanvas returns null without throwing TypeError', () => {
      const failingScene = {
        textures: {
          exists: vi.fn(() => false),
          createCanvas: vi.fn(() => null) // Simulated Canvas allocation failure / OOM
        }
      } as any;

      expect(() => {
        UITextureFactory.generateAll(failingScene);
      }).not.toThrow();
    });

    it('verifies all defined UI_TEXTURE_KEYS are covered by generator methods', () => {
      UITextureFactory.generateAll(mockScene);
      const allKeys = Object.values(UI_TEXTURE_KEYS);
      expect(allKeys.length).toBe(Object.values(UI_TEXTURE_KEYS).length);
      for (const key of allKeys) {
        expect(textureRegistry.has(key)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. BronzeButton Rapid Clicks & Lifecycle Stress
  // =========================================================================
  describe('2. BronzeButton Rapid Interaction & Lifecycle Stress', () => {
    let mockScene: any;
    let bgNineSliceMock: any;
    let contentContainerMock: any;
    let glowGraphicsMock: any;
    let titleTextMock: any;
    let activeTweens: any[];

    beforeEach(() => {
      activeTweens = [];
      bgNineSliceMock = {
        setTexture: vi.fn(),
        currentTexture: UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL
      };
      bgNineSliceMock.setTexture.mockImplementation((k: string) => {
        bgNineSliceMock.currentTexture = k;
      });

      contentContainerMock = {
        x: 0,
        y: 0,
        add: vi.fn()
      };

      glowGraphicsMock = {
        clear: vi.fn(),
        fillStyle: vi.fn(),
        fillRoundedRect: vi.fn(),
        setVisible: vi.fn(),
        visible: false
      };
      glowGraphicsMock.setVisible.mockImplementation((v: boolean) => {
        glowGraphicsMock.visible = v;
      });

      titleTextMock = {
        setOrigin: vi.fn().mockReturnThis(),
        setColor: vi.fn(),
        setText: vi.fn(),
        color: UI_COLORS.goldBright
      };
      titleTextMock.setColor.mockImplementation((c: string) => {
        titleTextMock.color = c;
      });

      mockScene = {
        add: {
          graphics: vi.fn(() => glowGraphicsMock),
          nineslice: vi.fn(() => bgNineSliceMock),
          container: vi.fn(() => contentContainerMock),
          text: vi.fn(() => titleTextMock),
          existing: vi.fn()
        },
        tweens: {
          add: vi.fn((config: any) => {
            const tween = {
              config,
              stopped: false,
              stop: vi.fn(() => {
                tween.stopped = true;
              })
            };
            activeTweens.push(tween);
            return tween;
          })
        }
      };
    });

    it('survives 100 rapid pointerdown/pointerup clicks, accurately tracking displacement and callbacks', () => {
      let clickCount = 0;
      const btn = new BronzeButton(mockScene, {
        x: 100,
        y: 100,
        title: '测试按钮',
        onClick: () => {
          clickCount++;
        }
      });

      const initialTweensCount = activeTweens.length;

      // Execute 100 rapid click cycles
      for (let i = 0; i < 100; i++) {
        btn.emit('pointerdown');
        expect(contentContainerMock.y).toBe(2);
        expect(bgNineSliceMock.currentTexture).toBe(UI_TEXTURE_KEYS.BTN_BRONZE_PRESSED);

        btn.emit('pointerup');
        expect(contentContainerMock.y).toBe(0);
        expect(bgNineSliceMock.currentTexture).toBe(UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL);
      }

      expect(clickCount).toBe(100);
      // Crucial juice assertion: Rapid clicking must NOT spawn runaway tweens or memory leaks
      expect(activeTweens.length).toBe(initialTweensCount);
    });

    it('handles drag-out cancellation: pointerdown followed by pointerout resets displacement and aborts onClick', () => {
      let clickCount = 0;
      const btn = new BronzeButton(mockScene, {
        x: 100,
        y: 100,
        title: '放弃出征',
        onClick: () => {
          clickCount++;
        }
      });

      // Pointer down
      btn.emit('pointerdown');
      expect(contentContainerMock.y).toBe(2);
      expect(bgNineSliceMock.currentTexture).toBe(UI_TEXTURE_KEYS.BTN_BRONZE_PRESSED);

      // User drags finger away from button -> pointerout fires
      btn.emit('pointerout');
      expect(contentContainerMock.y).toBe(0);
      expect(bgNineSliceMock.currentTexture).toBe(UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL);

      // Pointer released outside button (no pointerup on btn)
      expect(clickCount).toBe(0);
    });

    it('handles multiple consecutive pointerdown events without cumulative displacement', () => {
      const btn = new BronzeButton(mockScene, {
        x: 100,
        y: 100,
        title: '连击'
      });

      btn.emit('pointerdown');
      btn.emit('pointerdown');
      btn.emit('pointerdown');

      // y must remain strictly 2, not 2 * 3 = 6
      expect(contentContainerMock.y).toBe(2);

      btn.emit('pointerup');
      expect(contentContainerMock.y).toBe(0);
    });

    it('permits button destruction inside onClick callback without throwing runtime exception', () => {
      let btnInstance: BronzeButton | null = null;
      let destroyedCleanly = false;

      btnInstance = new BronzeButton(mockScene, {
        x: 100,
        y: 100,
        title: '一次性自毁按钮',
        onClick: () => {
          btnInstance!.destroy();
          destroyedCleanly = true;
        }
      });

      expect(() => {
        btnInstance!.emit('pointerdown');
        btnInstance!.emit('pointerup');
      }).not.toThrow();

      expect(destroyedCleanly).toBe(true);
      expect((btnInstance as any).isDestroyed).toBe(true);
    });

    it('strictly suppresses all pointer events and callbacks when setEnabled(false) is called', () => {
      let clickCount = 0;
      const btn = new BronzeButton(mockScene, {
        x: 100,
        y: 100,
        title: '禁用按钮',
        enableGlow: true,
        onClick: () => {
          clickCount++;
        }
      });

      expect(btn.alpha).toBe(1.0);
      btn.setEnabled(false);
      expect(btn.alpha).toBe(0.5);

      // Attempt hover, down, up
      btn.emit('pointerover');
      expect(bgNineSliceMock.currentTexture).toBe(UI_TEXTURE_KEYS.BTN_BRONZE_NORMAL);

      btn.emit('pointerdown');
      expect(contentContainerMock.y).toBe(0);

      btn.emit('pointerup');
      expect(clickCount).toBe(0);

      // Re-enable
      btn.setEnabled(true);
      expect(btn.alpha).toBe(1.0);
      btn.emit('pointerdown');
      expect(contentContainerMock.y).toBe(2);
      btn.emit('pointerup');
      expect(clickCount).toBe(1);
    });

    it('cleans up breathing glow tween when destroyed', () => {
      const btn = new BronzeButton(mockScene, {
        x: 100,
        y: 100,
        title: '呼吸光晕按钮',
        enableGlow: true
      });

      expect(activeTweens.length).toBe(1);
      const glowTween = activeTweens[0];
      expect(glowTween.stopped).toBe(false);

      btn.destroy();
      expect(glowTween.stopped).toBe(true);
      expect(glowGraphicsMock.visible).toBe(false);
    });
  });

  // =========================================================================
  // 3. VermilionStamp.stampAt() Edge Cases & Teardown Safety
  // =========================================================================
  describe('3. VermilionStamp.stampAt() Edge Cases & Teardown Safety', () => {
    let mockScene: any;
    let createdImages: any[];
    let createdCircles: any[];
    let tweenConfigs: any[];

    beforeEach(() => {
      createdImages = [];
      createdCircles = [];
      tweenConfigs = [];

      mockScene = {
        add: {
          image: vi.fn((x: number, y: number, key: string) => {
            const img = {
              x,
              y,
              key,
              scaleX: 1,
              scaleY: 1,
              angle: 0,
              alpha: 1,
              depth: 0,
              active: true,
              isDestroyed: false,
              setScale: vi.fn().mockImplementation((s: number) => { img.scaleX = s; img.scaleY = s; return img; }),
              setAngle: vi.fn().mockImplementation((a: number) => { img.angle = a; return img; }),
              setAlpha: vi.fn().mockImplementation((a: number) => { img.alpha = a; return img; }),
              setDepth: vi.fn().mockImplementation((d: number) => { img.depth = d; return img; }),
              destroy: vi.fn().mockImplementation(() => { img.isDestroyed = true; img.active = false; })
            };
            createdImages.push(img);
            return img;
          }),
          circle: vi.fn((x: number, y: number, r: number, color: number, alpha: number) => {
            const circ = {
              x,
              y,
              r,
              color,
              alpha,
              depth: 0,
              isDestroyed: false,
              setDepth: vi.fn().mockImplementation((d: number) => { circ.depth = d; return circ; }),
              destroy: vi.fn().mockImplementation(() => { circ.isDestroyed = true; })
            };
            createdCircles.push(circ);
            return circ;
          })
        },
        tweens: {
          add: vi.fn((cfg: any) => {
            tweenConfigs.push(cfg);
            return {
              stop: vi.fn()
            };
          })
        }
      };
    });

    it('safely stamps with options undefined without error', () => {
      let stampImg: any = null;
      expect(() => {
        stampImg = VermilionStamp.stampAt(mockScene, 300, 200, UI_TEXTURE_KEYS.STAMP_DAJIE);
      }).not.toThrow();

      expect(stampImg).not.toBeNull();
      expect(stampImg.scaleX).toBe(2.2);
      expect(stampImg.angle).toBe(-8);
      expect(stampImg.alpha).toBe(0);

      // Trigger landing tween completion
      const landingTween = tweenConfigs.find(c => c.targets === stampImg);
      expect(landingTween).toBeDefined();

      expect(() => {
        landingTween.onComplete();
      }).not.toThrow();

      // Splatter particles must be spawned (8 particles)
      expect(createdCircles.length).toBe(8);
    });

    it('safely stamps when targetPanel is explicitly null or empty object without y', () => {
      // 1. null targetPanel
      expect(() => {
        const stamp = VermilionStamp.stampAt(mockScene, 300, 200, UI_TEXTURE_KEYS.STAMP_DAJIE, {
          targetPanel: null as any
        });
        const tween = tweenConfigs.find(c => c.targets === stamp);
        tween.onComplete();
      }).not.toThrow();

      // 2. empty object targetPanel
      expect(() => {
        const stamp = VermilionStamp.stampAt(mockScene, 300, 200, UI_TEXTURE_KEYS.STAMP_DAJIE, {
          targetPanel: {} as any
        });
        const tween = tweenConfigs.find(c => c.targets === stamp);
        tween.onComplete();
      }).not.toThrow();
    });

    it('performs targetPanel micro-shake tween when valid targetPanel with y is provided', () => {
      const mockPanel = { y: 150 };
      const stamp = VermilionStamp.stampAt(mockScene, 300, 200, UI_TEXTURE_KEYS.STAMP_DAJIE, {
        targetPanel: mockPanel as any
      });

      const landingTween = tweenConfigs.find(c => c.targets === stamp);
      landingTween.onComplete();

      // Find panel shake tween
      const panelShakeTween = tweenConfigs.find(c => c.targets === mockPanel);
      expect(panelShakeTween).toBeDefined();
      expect(panelShakeTween.y).toBe(153); // origY + 3
      expect(panelShakeTween.duration).toBe(40);
      expect(panelShakeTween.yoyo).toBe(true);

      // On shake completion, panel.y restores to origY
      panelShakeTween.onComplete();
      expect(mockPanel.y).toBe(150);
    });

    it('handles destroyed targetPanel GameObject in onComplete gracefully', () => {
      const mockPanel = {
        y: 150,
        active: false,
        isDestroyed: true
      };

      const stamp = VermilionStamp.stampAt(mockScene, 300, 200, UI_TEXTURE_KEYS.STAMP_DAJIE, {
        targetPanel: mockPanel as any
      });

      const landingTween = tweenConfigs.find(c => c.targets === stamp);

      expect(() => {
        landingTween.onComplete();
      }).not.toThrow();

      // Shake tween was registered
      const panelShakeTween = tweenConfigs.find(c => c.targets === mockPanel);
      expect(panelShakeTween).toBeDefined();
      expect(() => {
        panelShakeTween.onComplete();
      }).not.toThrow();
      expect(mockPanel.y).toBe(150);
    });

    it('verifies 8 ink splatter particles with automatic lifecycle teardown', () => {
      const stamp = VermilionStamp.stampAt(mockScene, 300, 200, UI_TEXTURE_KEYS.STAMP_DAJIE, {
        targetDepth: 200
      });
      const landingTween = tweenConfigs.find(c => c.targets === stamp);
      landingTween.onComplete();

      expect(createdCircles.length).toBe(8);

      for (const p of createdCircles) {
        expect(p.depth).toBe(199); // targetDepth - 1
        expect(p.isDestroyed).toBe(false);

        // Find particle fade tween
        const pTween = tweenConfigs.find(c => c.targets === p);
        expect(pTween).toBeDefined();

        // Complete particle tween -> p.destroy() must be called
        pTween.onComplete();
        expect(p.isDestroyed).toBe(true);
      }
    });

    it('invokes onComplete callback with stamp instance', () => {
      let callbackInvoked = false;
      let callbackArg: any = null;

      const stamp = VermilionStamp.stampAt(mockScene, 300, 200, UI_TEXTURE_KEYS.STAMP_DAJIE, {
        onComplete: (s) => {
          callbackInvoked = true;
          callbackArg = s;
        }
      });

      const landingTween = tweenConfigs.find(c => c.targets === stamp);
      landingTween.onComplete();

      expect(callbackInvoked).toBe(true);
      expect(callbackArg).toBe(stamp);
    });
  });

  // =========================================================================
  // 4. NineSlice Texture Proportioning & Distortion Forensic Audit
  // =========================================================================
  describe('4. NineSlice Texture Proportioning & Geometric Distortion Forensic Audit', () => {

    it('audits PANEL_XUAN_BRONZE (160x160, 40px margins): corner features vs stretchable edge features', () => {
      const preset = NINESLICE_PRESETS.PANEL_XUAN_BRONZE;
      expect(preset.width).toBe(160);
      expect(preset.height).toBe(160);
      expect(preset.leftWidth).toBe(40);
      expect(preset.rightWidth).toBe(40);
      expect(preset.topHeight).toBe(40);
      expect(preset.bottomHeight).toBe(40);

      // Center unscaled region
      const centerWidth = preset.width - preset.leftWidth - preset.rightWidth; // 80px
      const centerHeight = preset.height - preset.topHeight - preset.bottomHeight; // 80px
      expect(centerWidth).toBe(80);
      expect(centerHeight).toBe(80);

      // Audit corner Taotie motifs: drawn inside drawBeastCorner(0, 0)
      // Geometry bounds: max coord is x=36, y=36
      const cornerMaxExtent = 36;
      expect(cornerMaxExtent).toBeLessThanOrEqual(preset.leftWidth);
      expect(cornerMaxExtent).toBeLessThanOrEqual(preset.topHeight);

      // FORENSIC OBSERVATION:
      // In SettlementModal.ts: panelW = 660, panelH = 1000
      const modalW = 660;
      const modalH = 1000;
      const stretchW = (modalW - preset.leftWidth - preset.rightWidth) / centerWidth;
      const stretchH = (modalH - preset.topHeight - preset.bottomHeight) / centerHeight;

      expect(stretchW).toBeCloseTo(7.25, 2);  // 580 / 80 = 7.25x
      expect(stretchH).toBeCloseTo(11.50, 2); // 920 / 80 = 11.50x

      // In UITextureFactory.ts:
      // drawRivet(w / 2, 7) placed at x = 80, y = 7 (radius = 3.5, diameter = 7)
      // Because x = 80 is in the center horizontal slice [40..120],
      // the rivet undergoes 7.25x horizontal stretching:
      const rivetOriginalDiameter = 7;
      const stretchedRivetWidth = rivetOriginalDiameter * stretchW;
      expect(stretchedRivetWidth).toBeCloseTo(50.75, 2);

      // Proves that edge rivets at w/2 deform into 50.75px wide ellipses!
    });

    it('audits CARD_BAMBOO (128x128, 24px margins): bronze clasps in stretch zone', () => {
      const preset = NINESLICE_PRESETS.CARD_BAMBOO;
      expect(preset.width).toBe(128);
      expect(preset.height).toBe(128);
      expect(preset.leftWidth).toBe(24);
      expect(preset.rightWidth).toBe(24);

      const centerWidth = preset.width - preset.leftWidth - preset.rightWidth; // 80px
      expect(centerWidth).toBe(80);

      // In StageSelectScene.ts: cardW = 670, cardH = 220
      const cardW = 670;
      const stretchW = (cardW - preset.leftWidth - preset.rightWidth) / centerWidth;
      expect(stretchW).toBeCloseTo(7.775, 3); // 622 / 80 = 7.775x

      // In UITextureFactory.ts: drawClasp(w / 2, 4) where clasp width = 32px
      // Because w/2 = 64 is in the center slice [24..104], the clasp stretches horizontally:
      const originalClaspWidth = 32;
      const stretchedClaspWidth = originalClaspWidth * stretchW;
      expect(stretchedClaspWidth).toBeCloseTo(248.8, 1);

      // Proves that the clasp at w/2 deforms from 32px to ~249px wide!
    });

    it('audits BUTTON_BRONZE (180x56, 16px margins): height invariant and corner notches', () => {
      const preset = NINESLICE_PRESETS.BUTTON_BRONZE;
      expect(preset.width).toBe(180);
      expect(preset.height).toBe(56);
      expect(preset.leftWidth).toBe(16);
      expect(preset.rightWidth).toBe(16);
      expect(preset.topHeight).toBe(16);
      expect(preset.bottomHeight).toBe(16);

      // In BronzeButton.ts, buttons are used at height: 56px (HomeScene, StageSelectScene, SettlementModal)
      // When height = 56px, vertical stretch is (56 - 32) / (56 - 32) = 1.0x (ZERO vertical distortion)
      const standardHeight = 56;
      const verticalStretch = (standardHeight - 32) / (preset.height - 32);
      expect(verticalStretch).toBe(1.0);

      // Corner notches are drawn at x=5, w-9 (171), y=5, h-9 (47)
      // 5 <= 16, 180 - 171 = 9 <= 16 -> completely contained within 16px corner margins
      expect(5).toBeLessThan(preset.leftWidth);
      expect(180 - 171).toBeLessThan(preset.rightWidth);
      expect(5).toBeLessThan(preset.topHeight);
      expect(56 - 47).toBeLessThan(preset.bottomHeight);

      // When scaled to width 240 in SettlementModal:
      const modalBtnWidth = 240;
      const centerWidth = preset.width - 32; // 148px
      const horizontalStretch = (modalBtnWidth - 32) / centerWidth;
      expect(horizontalStretch).toBeCloseTo(1.405, 3); // Mild 1.4x stretch
    });
  });
});
