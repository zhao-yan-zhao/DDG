import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => {
  class MockGameObject {
    public x = 0;
    public y = 0;
    public alpha = 1;
    public visible = true;
    public depth = 0;
    public list: any[] = [];
    public active = true;

    constructor(public scene?: any) {}

    setDepth(d: number) { this.depth = d; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setDisplaySize() { return this; }
    setOrigin() { return this; }
    setAlpha(a: number) { this.alpha = a; return this; }
    setInteractive(shape?: any, callback?: any) {
      (this as any).hitArea = shape;
      (this as any).hitAreaCallback = callback;
      return this;
    }
    setSize(w = 0, h = 0) { (this as any).width = w; (this as any).height = h; return this; }
    setColor() { return this; }
    setStyle() { return this; }
    setText(t: string) { (this as any).text = t; return this; }
    on() { return this; }
    off() { return this; }
    emit() { return this; }
    clear() { return this; }
    fillStyle() { return this; }
    fillRect() { return this; }
    fillRoundedRect() { return this; }
    fillCircle() { return this; }
    lineStyle() { return this; }
    strokeRoundedRect() { return this; }
    strokeCircle() { return this; }
    add(item: any) {
      if (Array.isArray(item)) this.list.push(...item);
      else this.list.push(item);
      return this;
    }
    destroy() { this.active = false; }
  }

  class MockScene {
    public add = {
      container: (x = 0, y = 0) => new MockGameObject().setPosition(x, y),
      graphics: () => new MockGameObject(),
      text: (x = 0, y = 0, text = '') => {
        const obj = new MockGameObject().setPosition(x, y);
        (obj as any).text = text;
        return obj;
      },
      nineslice: () => new MockGameObject(),
      image: (x = 0, y = 0) => new MockGameObject().setPosition(x, y),
      existing: (obj: any) => obj
    };
    public tweens = {
      add: vi.fn().mockReturnValue({ stop: vi.fn() }),
      killAll: vi.fn()
    };
    public time = {
      delayedCall: vi.fn(),
      removeAllEvents: vi.fn()
    };
    public scale = {
      on: vi.fn(),
      off: vi.fn()
    };
    public input = {
      keyboard: {
        on: vi.fn(),
        off: vi.fn()
      }
    };
    public events = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn()
    };
    public scene = {
      get: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
      launch: vi.fn(),
      isActive: vi.fn().mockReturnValue(false)
    };
    public textures = {
      exists: vi.fn().mockReturnValue(true)
    };
    constructor(public config?: any) {}
  }

  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        Container: MockGameObject,
        Graphics: MockGameObject,
        Text: MockGameObject,
        NineSlice: MockGameObject,
        Image: MockGameObject
      },
      Geom: {
        Rectangle: class {
          constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
          static Contains() { return true; }
        },
        Circle: class {
          static Contains() { return true; }
        }
      }
    }
  };
});

import { TacticsDeck } from '../src/core/tactics/tactics-deck';
import { BattleScene } from '../src/presentation/scenes/battle-scene';
import { PauseMenuModal } from '../src/presentation/ui/pause-menu-modal';
import { ThreeSceneManager } from '../src/presentation/three/three-scene-manager';
import { BronzeButton } from '../src/presentation/ui/bronze-button';

describe('TacticsDeck.getPickedCards', () => {
  let deck: TacticsDeck;

  beforeEach(() => {
    deck = new TacticsDeck();
  });

  it('returns empty array when no cards have been picked', () => {
    const picked = deck.getPickedCards();
    expect(picked).toEqual([]);
    expect(picked.length).toBe(0);
  });

  it('accurately records picked cards and their pick counts', () => {
    const allCards = deck.getAllCards();
    expect(allCards.length).toBeGreaterThan(0);

    const card1 = allCards[0];
    const card2 = allCards[1];

    deck.pick(card1.id);
    deck.pick(card1.id);
    deck.pick(card2.id);

    const picked = deck.getPickedCards();
    expect(picked.length).toBe(2);

    const item1 = picked.find(p => p.config.id === card1.id);
    const item2 = picked.find(p => p.config.id === card2.id);

    expect(item1).toBeDefined();
    expect(item1?.count).toBe(2);
    expect(item2).toBeDefined();
    expect(item2?.count).toBe(1);
  });

  it('resets picked cards back to empty when reset() is called', () => {
    const allCards = deck.getAllCards();
    deck.pick(allCards[0].id);
    expect(deck.getPickedCards().length).toBe(1);

    deck.reset();
    expect(deck.getPickedCards().length).toBe(0);
  });
});

describe('BattleScene.getBattlefieldStatus', () => {
  let scene: BattleScene;

  beforeEach(() => {
    scene = new BattleScene();
    (scene as any).stageId = 3;
    (scene as any).stageConfig = {
      id: 3,
      chapterId: 1,
      name: '第 3 关 居庸关隘',
      totalWaves: 10,
      wallMaxHp: 1000
    };
    (scene as any).waveFSM = {
      getCurrentWave: () => 4,
      getWallState: () => ({ currentHp: 850, maxHp: 1000, isBroken: false })
    };
    (scene as any).waveSpawner = {
      getTotalKilled: () => 42
    };
    (scene as any).wallet = {
      getBalance: () => 188
    };
    (scene as any).tacticsDeck = new TacticsDeck();
    (scene as any).gameSpeed = 1.0;
  });

  it('retrieves full campaign battlefield status snapshot', () => {
    const status = scene.getBattlefieldStatus();

    expect(status.battleMode).toBe('campaign');
    expect(status.stageId).toBe(3);
    expect(status.stageName).toBe('第 3 关 居庸关隘');
    expect(status.chapterId).toBe(1);
    expect(status.currentWave).toBe(4);
    expect(status.totalWaves).toBe(10);
    expect(status.wallHp).toBe(850);
    expect(status.wallMaxHp).toBe(1000);
    expect(status.silver).toBe(188);
    expect(status.totalKills).toBe(42);
    expect(status.gameSpeed).toBe(1.0);
    expect(Array.isArray(status.pickedTactics)).toBe(true);
  });

  it('retrieves endless mode status snapshot with custom name and endless kills', () => {
    scene.battleMode = 'endless';
    (scene as any).endlessKills = { total: 99, elite: 10, boss: 2 };

    const status = scene.getBattlefieldStatus();
    expect(status.battleMode).toBe('endless');
    expect(status.stageName).toBe('演武 · 无尽试炼');
    expect(status.totalWaves).toBe(999);
    expect(status.totalKills).toBe(99);
  });
});

describe('PauseMenuModal Lifecycle and Actions', () => {
  let mockUiScene: any;
  let mockBattleScene: any;
  let modal: PauseMenuModal;

  beforeEach(() => {
    mockBattleScene = {
      pauseBattle: vi.fn(),
      resumeBattle: vi.fn(),
      retryBattle: vi.fn(),
      teardownAndExitToHome: vi.fn(),
      toggleGameSpeed: vi.fn().mockReturnValue(2.0),
      toggleRenderMode: vi.fn().mockReturnValue('3d'),
      gameSpeed: 1.0,
      getBattlefieldStatus: vi.fn().mockReturnValue({
        battleMode: 'campaign',
        stageId: 1,
        stageName: '第 1 关 居庸初战',
        chapterId: 1,
        currentWave: 2,
        totalWaves: 10,
        wallHp: 950,
        wallMaxHp: 1000,
        silver: 75,
        totalKills: 12,
        gameSpeed: 1.0,
        renderMode: '2d',
        isMuted: false,
        pickedTactics: []
      })
    };

    mockUiScene = {
      add: {
        container: () => {
          const c = {
            depth: 0,
            list: [] as any[],
            setDepth(d: number) { this.depth = d; return this; },
            add(item: any) {
              if (Array.isArray(item)) this.list.push(...item);
              else this.list.push(item);
              return this;
            },
            destroy: vi.fn(),
            setSize: vi.fn().mockReturnThis(),
            setInteractive: vi.fn().mockReturnThis(),
            on: vi.fn()
          };
          return c;
        },
        graphics: () => ({
          setVisible: vi.fn().mockReturnThis(),
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          fillRoundedRect: vi.fn().mockReturnThis(),
          fillCircle: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRoundedRect: vi.fn().mockReturnThis(),
          strokeCircle: vi.fn().mockReturnThis(),
          clear: vi.fn().mockReturnThis(),
          setInteractive: vi.fn().mockReturnThis(),
          on: vi.fn()
        }),
        text: () => ({
          setOrigin: vi.fn().mockReturnThis(),
          setText: vi.fn().mockReturnThis()
        }),
        nineslice: () => ({}),
        existing: (btn: any) => btn
      },
      tweens: {
        add: vi.fn().mockReturnValue({ stop: vi.fn() })
      },
      updateSpeedButton: vi.fn(),
      updateMuteButton: vi.fn(),
      updateViewModeButton: vi.fn()
    };

    modal = new PauseMenuModal(mockUiScene, mockBattleScene);
  });

  it('initializes in closed state', () => {
    expect(modal.isOpen()).toBe(false);
  });

  it('show() opens modal, pauses battleScene, and blocks interaction behind', () => {
    modal.show();

    expect(modal.isOpen()).toBe(true);
    expect(mockBattleScene.pauseBattle).toHaveBeenCalled();
    expect(mockBattleScene.getBattlefieldStatus).toHaveBeenCalled();
  });

  it('resume() closes modal and resumes battleScene', () => {
    modal.show();
    expect(modal.isOpen()).toBe(true);

    modal.resume();
    expect(modal.isOpen()).toBe(false);
    expect(mockBattleScene.resumeBattle).toHaveBeenCalled();
  });

  it('retryStage() closes modal, unpauses battle, and invokes battleScene.retryBattle()', () => {
    modal.show();
    modal.retryStage();

    expect(modal.isOpen()).toBe(false);
    expect(mockBattleScene.resumeBattle).toHaveBeenCalled();
    expect(mockBattleScene.retryBattle).toHaveBeenCalled();
  });

  it('returnToHome() closes modal, unpauses battle, and invokes battleScene.teardownAndExitToHome()', () => {
    modal.show();
    modal.returnToHome();

    expect(modal.isOpen()).toBe(false);
    expect(mockBattleScene.resumeBattle).toHaveBeenCalled();
    expect(mockBattleScene.teardownAndExitToHome).toHaveBeenCalled();
  });
});

describe('BronzeButton HitArea Centered Geometry', () => {
  it('configures centered hitArea bounds to match [-w/2, -h/2, w, h]', () => {
    const mockScene: any = {
      add: {
        graphics: () => ({
          setVisible: vi.fn().mockReturnThis(),
          fillStyle: vi.fn().mockReturnThis(),
          fillRoundedRect: vi.fn().mockReturnThis(),
          clear: vi.fn().mockReturnThis()
        }),
        nineslice: () => ({
          setTexture: vi.fn()
        }),
        container: () => ({
          add: vi.fn()
        }),
        text: () => ({
          setOrigin: vi.fn().mockReturnThis(),
          setColor: vi.fn().mockReturnThis(),
          setText: vi.fn().mockReturnThis()
        }),
        existing: (btn: any) => btn
      },
      tweens: {
        add: vi.fn().mockReturnValue({ stop: vi.fn() })
      }
    };

    const btn = new BronzeButton(mockScene, {
      x: 375,
      y: 600,
      width: 280,
      height: 50,
      title: '测试按钮'
    });

    expect(btn.width).toBe(280);
    expect(btn.height).toBe(50);
  });
});
