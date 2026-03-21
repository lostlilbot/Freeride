import { Platform, PermissionsAndroid, Linking, NativeModules } from 'react-native';

const { StorageAccessFramework } = NativeModules;

export interface PermissionStatus {
  allFilesAccess: boolean;
  networkState: boolean;
  notifications: boolean;
  foregroundService: boolean;
}

export class SystemPermissionCheck {
  async checkAllFilesAccess(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE
      );
      return granted;
    } catch (error) {
      console.warn('[PermissionCheck] Error checking MANAGE_EXTERNAL_STORAGE:', error);
      return false;
    }
  }

  async requestAllFilesAccess(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE,
        {
          title: 'OpenClaw Nexus - All Files Access',
          message: 'OpenClaw needs access to all files on your device to function as a sovereign agent. This allows the AI to read/write files across your entire storage for automation tasks.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        await this.openAllFilesSettings();
      }
      
      return false;
    } catch (error) {
      console.error('[PermissionCheck] Error requesting MANAGE_EXTERNAL_STORAGE:', error);
      return false;
    }
  }

  async openAllFilesSettings(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('[PermissionCheck] Error opening settings:', error);
    }
  }

  async checkAndRequestAllFilesAccess(): Promise<boolean> {
    const hasAccess = await this.checkAllFilesAccess();
    if (hasAccess) return true;
    
    return await this.requestAllFilesAccess();
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    const status: PermissionStatus = {
      allFilesAccess: false,
      networkState: false,
      notifications: false,
      foregroundService: true,
    };

    if (Platform.OS === 'android') {
      try {
        status.allFilesAccess = await this.checkAllFilesAccess();
        status.networkState = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE
        );
        status.notifications = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      } catch (error) {
        console.error('[PermissionCheck] Error getting permission status:', error);
      }
    }

    return status;
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[PermissionCheck] Error requesting notifications:', error);
      return false;
    }
  }

  getManifestPermissions(): string[] {
    return [
      'MANAGE_EXTERNAL_STORAGE',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_SPECIAL_USE',
      'WAKE_LOCK',
      'ACCESS_NETWORK_STATE',
      'POST_NOTIFICATIONS',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'SYSTEM_ALERT_WINDOW',
      'RECEIVE_BOOT_COMPLETED',
    ];
  }
}

export const systemPermissionCheck = new SystemPermissionCheck();
