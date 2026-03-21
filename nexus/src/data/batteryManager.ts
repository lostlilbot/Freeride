import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';

export type PowerMode = 'normal' | 'low_power' | 'critical';
export type BatteryLevel = 'high' | 'medium' | 'low' | 'critical';

export interface BatteryState {
  level: number;
  state: 'charging' | 'unplugged' | 'full' | 'unknown';
  powerMode: PowerMode;
}

export interface ThrottleConfig {
  maxConcurrentRequests: number;
  enableActiveLearning: boolean;
  enableBackgroundSync: boolean;
  enableMCPNetwork: boolean;
  modelComplexity: 'full' | 'reduced' | 'minimal';
}

const BATTERY_THRESHOLDS = {
  HIGH: 50,
  MEDIUM: 30,
  LOW: 15,
  CRITICAL: 5,
};

const THROTTLE_CONFIGS: Record<PowerMode, ThrottleConfig> = {
  normal: {
    maxConcurrentRequests: 3,
    enableActiveLearning: true,
    enableBackgroundSync: true,
    enableMCPNetwork: true,
    modelComplexity: 'full',
  },
  low_power: {
    maxConcurrentRequests: 1,
    enableActiveLearning: false,
    enableBackgroundSync: false,
    enableMCPNetwork: false,
    modelComplexity: 'reduced',
  },
  critical: {
    maxConcurrentRequests: 0,
    enableActiveLearning: false,
    enableBackgroundSync: false,
    enableMCPNetwork: false,
    modelComplexity: 'minimal',
  },
};

export class BatteryManager {
  private batteryLevel: number = 100;
  private batteryState: BatteryState['state'] = 'unknown';
  private powerMode: PowerMode = 'normal';
  private listeners: Array<(state: BatteryState) => void> = [];
  private isMonitoring = false;

  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      this.batteryLevel = 100;
      this.batteryState = 'full';
      this.updatePowerMode();
      return;
    }

    try {
      const { BatteryManager: NativeBattery } = NativeModules;
      
      if (NativeBattery) {
        const level = await NativeBattery.getBatteryLevel();
        const state = await NativeBattery.getBatteryState();
        
        this.batteryLevel = Math.round(level * 100);
        this.batteryState = state;
        this.updatePowerMode();
      }
    } catch (error) {
      console.warn('[BatteryManager] Error getting battery info:', error);
      this.batteryLevel = 100;
      this.batteryState = 'full';
    }

    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    if (Platform.OS === 'android') {
      DeviceEventEmitter.addListener('onBatteryLevelChange', (level: number) => {
        this.batteryLevel = Math.round(level * 100);
        this.updatePowerMode();
        this.notifyListeners();
      });

      DeviceEventEmitter.addListener('onBatteryStateChange', (state: string) => {
        this.batteryState = state as BatteryState['state'];
        this.notifyListeners();
      });
    }

    setInterval(() => {
      if (!this.isMonitoring) return;
      this.checkBattery();
    }, 60000);
  }

  private async checkBattery(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const { BatteryManager: NativeBattery } = NativeModules;
      if (NativeBattery) {
        const level = await NativeBattery.getBatteryLevel();
        this.batteryLevel = Math.round(level * 100);
        this.updatePowerMode();
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('[BatteryManager] Error checking battery:', error);
    }
  }

  private updatePowerMode(): void {
    if (this.batteryLevel >= BATTERY_THRESHOLDS.LOW) {
      this.powerMode = 'normal';
    } else if (this.batteryLevel >= BATTERY_THRESHOLDS.CRITICAL) {
      this.powerMode = 'low_power';
    } else {
      this.powerMode = 'critical';
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  getState(): BatteryState {
    return {
      level: this.batteryLevel,
      state: this.batteryState,
      powerMode: this.powerMode,
    };
  }

  getBatteryLevel(): number {
    return this.batteryLevel;
  }

  getBatteryLabel(): BatteryLevel {
    if (this.batteryLevel >= BATTERY_THRESHOLDS.HIGH) return 'high';
    if (this.batteryLevel >= BATTERY_THRESHOLDS.MEDIUM) return 'medium';
    if (this.batteryLevel >= BATTERY_THRESHOLDS.LOW) return 'low';
    return 'critical';
  }

  getThrottleConfig(): ThrottleConfig {
    return THROTTLE_CONFIGS[this.powerMode];
  }

  isActiveLearningAllowed(): boolean {
    return THROTTLE_CONFIGS[this.powerMode].enableActiveLearning;
  }

  isBackgroundSyncAllowed(): boolean {
    return THROTTLE_CONFIGS[this.powerMode].enableBackgroundSync;
  }

  isNetworkAllowed(): boolean {
    return THROTTLE_CONFIGS[this.powerMode].enableMCPNetwork;
  }

  getMaxConcurrent(): number {
    return THROTTLE_CONFIGS[this.powerMode].maxConcurrentRequests;
  }

  shouldShowLowBatteryWarning(): boolean {
    return this.batteryLevel <= BATTERY_THRESHOLDS.LOW && 
           this.batteryState !== 'charging';
  }

  shouldShowCriticalWarning(): boolean {
    return this.batteryLevel <= BATTERY_THRESHOLDS.CRITICAL &&
           this.batteryState !== 'charging';
  }

  addListener(listener: (state: BatteryState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: BatteryState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  stop(): void {
    this.isMonitoring = false;
  }

  getStatusSummary(): string {
    const state = this.getState();
    const config = this.getThrottleConfig();
    
    return `🔋 Battery: ${state.level}% (${state.powerMode})\n` +
           `Active Learning: ${config.enableActiveLearning ? 'ON' : 'OFF'}\n` +
           `Background Sync: ${config.enableBackgroundSync ? 'ON' : 'OFF'}\n` +
           `Model: ${config.modelComplexity}`;
  }
}

export const batteryManager = new BatteryManager();
