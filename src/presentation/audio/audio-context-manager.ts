/**
 * 《孤城神机营》- AudioContextManager
 * Unified cross-platform Web Audio Context singleton.
 * Supports:
 *  - Standard browser window.AudioContext / webkitAudioContext
 *  - Douyin Mini-Game tt.getAudioContext()
 *  - First user interaction touch-unlock (pointerdown, touchstart, mousedown)
 *  - Page visibilitychange background suspend / foreground resume
 *  - Headless Node.js / Vitest safe mock stub with 0 crash
 */

// Declare Douyin global tt namespace for TypeScript
declare const tt: {
  getAudioContext?: () => AudioContext;
} | undefined;

export interface AudioContextStateListener {
  (state: AudioContextState): void;
}

/**
 * Lightweight mock AudioNode for headless testing environments
 */
export class MockAudioParam {
  public value: number;
  public defaultValue: number;
  public events: Array<{ type: string; value?: number; time: number; duration?: number; values?: Float32Array | number[] }> = [];

  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
  }

  public setValueAtTime(value: number, startTime: number): MockAudioParam {
    this.value = value;
    this.events.push({ type: 'setValueAtTime', value, time: startTime });
    return this;
  }

  public linearRampToValueAtTime(value: number, endTime: number): MockAudioParam {
    this.value = value;
    this.events.push({ type: 'linearRampToValueAtTime', value, time: endTime });
    return this;
  }

  public exponentialRampToValueAtTime(value: number, endTime: number): MockAudioParam {
    this.value = value;
    this.events.push({ type: 'exponentialRampToValueAtTime', value, time: endTime });
    return this;
  }

  public setValueCurveAtTime(values: Float32Array | number[], startTime: number, duration: number): MockAudioParam {
    this.events.push({ type: 'setValueCurveAtTime', values, time: startTime, duration });
    if (values.length > 0) {
      this.value = values[values.length - 1];
    }
    return this;
  }

  public cancelScheduledValues(cancelTime: number): MockAudioParam {
    this.events.push({ type: 'cancelScheduledValues', time: cancelTime });
    return this;
  }
}

export class MockAudioNode {
  public context: MockAudioContext;
  public connectedTo: any[] = [];
  public numberOfInputs: number = 1;
  public numberOfOutputs: number = 1;

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  public connect(destination: any, outputIndex?: number, inputIndex?: number): any {
    this.connectedTo.push(destination);
    return destination;
  }

  public disconnect(destination?: any): void {
    if (destination) {
      this.connectedTo = this.connectedTo.filter((d) => d !== destination);
    } else {
      this.connectedTo = [];
    }
  }
}

export class MockGainNode extends MockAudioNode {
  public gain: MockAudioParam;
  constructor(context: MockAudioContext) {
    super(context);
    this.gain = new MockAudioParam(1.0);
  }
}

export class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency: MockAudioParam;
  public detune: MockAudioParam;
  public started: boolean = false;
  public stopped: boolean = false;
  public startTime: number = 0;
  public stopTime: number = 0;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(440);
    this.detune = new MockAudioParam(0);
  }

  public start(when: number = 0): void {
    this.started = true;
    this.startTime = when;
  }

  public stop(when: number = 0): void {
    this.stopped = true;
    this.stopTime = when;
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency: MockAudioParam;
  public Q: MockAudioParam;
  public gain: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
    this.gain = new MockAudioParam(0);
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: MockAudioBuffer | null = null;
  public loop: boolean = false;
  public loopStart: number = 0;
  public loopEnd: number = 0;
  public playbackRate: MockAudioParam;
  public started: boolean = false;
  public stopped: boolean = false;

  constructor(context: MockAudioContext) {
    super(context);
    this.playbackRate = new MockAudioParam(1.0);
  }

  public start(when: number = 0): void {
    this.started = true;
  }

  public stop(when: number = 0): void {
    this.stopped = true;
  }
}

export class MockAudioBuffer {
  public numberOfChannels: number;
  public length: number;
  public sampleRate: number;
  public duration: number;
  private channelData: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channelData = [];
    for (let i = 0; i < numberOfChannels; i++) {
      this.channelData.push(new Float32Array(length));
    }
  }

  public getChannelData(channel: number): Float32Array {
    return this.channelData[channel] || this.channelData[0];
  }

  public copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const src = this.getChannelData(channelNumber);
    destination.set(src.subarray(bufferOffset || 0));
  }

  public copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const dst = this.getChannelData(channelNumber);
    dst.set(source, bufferOffset || 0);
  }
}

export class MockWaveShaperNode extends MockAudioNode {
  public curve: Float32Array | null = null;
  public oversample: OverSampleType = 'none';
}

export class MockDelayNode extends MockAudioNode {
  public delayTime: MockAudioParam;
  constructor(context: MockAudioContext, maxDelayTime: number = 1.0) {
    super(context);
    this.delayTime = new MockAudioParam(0);
  }
}

export class MockAudioContext {
  public state: AudioContextState = 'running';
  public currentTime: number = 0;
  public sampleRate: number = 44100;
  public destination: MockAudioNode;

  constructor() {
    this.destination = new MockAudioNode(this);
  }

  public createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  public createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode(this);
  }

  public createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode(this);
  }

  public createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode(this);
  }

  public createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(numberOfChannels, length, sampleRate);
  }

  public createWaveShaper(): MockWaveShaperNode {
    return new MockWaveShaperNode(this);
  }

  public createDelay(maxDelayTime?: number): MockDelayNode {
    return new MockDelayNode(this, maxDelayTime);
  }

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  public async close(): Promise<void> {
    this.state = 'closed';
  }

  /**
   * Helper to advance time in test environment
   */
  public advanceTime(seconds: number): void {
    this.currentTime += seconds;
  }
}

export class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private context: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private unlockHandlersRegistered: boolean = false;
  private visibilityHandlerRegistered: boolean = false;
  private stateListeners: Set<AudioContextStateListener> = new Set();
  private mockFallbackEnabled: boolean = true;
  private testContextOverride: AudioContext | null = null;

  private constructor() {
    this.initContext();
    this.registerTouchUnlock();
    this.registerVisibilityHandler();
  }

  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  /**
   * Forces a reset of the singleton (used in test teardown)
   */
  public static resetForTesting(): void {
    if (AudioContextManager.instance?.context) {
      try {
        if (typeof AudioContextManager.instance.context.close === 'function') {
          AudioContextManager.instance.context.close().catch(() => {});
        }
      } catch {
        // ignore close error
      }
    }
    AudioContextManager.instance = null;
  }

  /**
   * Overrides AudioContext for testing
   */
  public setContextForTesting(ctx: AudioContext | null): void {
    this.testContextOverride = ctx;
    this.context = ctx;
  }

  /**
   * Initializes the native AudioContext or Douyin AudioContext
   */
  private initContext(): void {
    if (this.testContextOverride) {
      this.context = this.testContextOverride;
      return;
    }

    // 1. Douyin Mini-Game runtime
    if (typeof tt !== 'undefined' && typeof tt.getAudioContext === 'function') {
      try {
        this.context = tt.getAudioContext();
        return;
      } catch (e) {
        console.warn('[AudioContextManager] Douyin tt.getAudioContext failed:', e);
      }
    }

    // 2. Browser standard Web Audio
    if (typeof window !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.context = new AudioCtxClass();
          return;
        }
      } catch (e) {
        console.warn('[AudioContextManager] Browser AudioContext initialization failed:', e);
      }
    }

    // 3. Headless / Vitest environment: Create Mock fallback if enabled
    if (this.mockFallbackEnabled) {
      this.context = new MockAudioContext() as unknown as AudioContext;
    }
  }

  /**
   * Gets the underlying AudioContext instance
   */
  public getContext(): AudioContext | null {
    if (!this.context) {
      this.initContext();
    }
    return this.context;
  }

  /**
   * Returns true if AudioContext is ready and active
   */
  public isAvailable(): boolean {
    return this.context !== null;
  }

  /**
   * Returns current AudioContext state ('running', 'suspended', 'closed')
   */
  public getState(): AudioContextState | 'unavailable' {
    if (!this.context) return 'unavailable';
    return this.context.state;
  }

  /**
   * Resumes the AudioContext if it is suspended (e.g. Autoplay policy)
   */
  public async resume(): Promise<void> {
    if (!this.context) return;
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
        this.isUnlocked = true;
        this.notifyStateListeners();
      } catch (err) {
        console.warn('[AudioContextManager] Failed to resume AudioContext:', err);
      }
    } else if (this.context.state === 'running') {
      this.isUnlocked = true;
    }
  }

  /**
   * Suspends the AudioContext
   */
  public async suspend(): Promise<void> {
    if (!this.context) return;
    if (this.context.state === 'running') {
      try {
        await this.context.suspend();
        this.notifyStateListeners();
      } catch (err) {
        console.warn('[AudioContextManager] Failed to suspend AudioContext:', err);
      }
    }
  }

  /**
   * Registers a listener for state changes
   */
  public onStateChange(listener: AudioContextStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyStateListeners(): void {
    if (!this.context) return;
    const state = this.context.state;
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[AudioContextManager] Error in state listener:', e);
      }
    }
  }

  /**
   * Registers global touch/click handlers to unlock audio on first interaction
   */
  private registerTouchUnlock(): void {
    if (this.unlockHandlersRegistered || typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.resume().then(() => {
        if (this.context && this.context.state === 'running') {
          this.removeTouchUnlockListeners(unlockHandler);
        }
      });
    };

    const events = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];
    for (const ev of events) {
      window.addEventListener(ev, unlockHandler, { passive: true, capture: true });
    }

    this.unlockHandlersRegistered = true;
  }

  private removeTouchUnlockListeners(handler: () => void): void {
    if (typeof window === 'undefined') return;
    const events = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];
    for (const ev of events) {
      window.removeEventListener(ev, handler, { capture: true });
    }
  }

  /**
   * Registers document visibilitychange to suspend on background and resume on foreground
   */
  private registerVisibilityHandler(): void {
    if (this.visibilityHandlerRegistered || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.suspend();
      } else {
        this.resume();
      }
    });

    this.visibilityHandlerRegistered = true;
  }
}
