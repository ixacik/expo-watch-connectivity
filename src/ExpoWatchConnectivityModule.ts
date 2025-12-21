import { requireNativeModule, NativeModule } from 'expo';
import type {
  SessionState,
  ActivationState,
  FileTransferInfo,
  UserInfoTransferInfo,
  WatchConnectivityEvents,
} from './ExpoWatchConnectivity.types';

/**
 * Native module interface declaration.
 * This defines the bridge between TypeScript and the native Swift/Kotlin implementations.
 */
declare class ExpoWatchConnectivityModuleType extends NativeModule<WatchConnectivityEvents> {
  // State getters
  getSessionState(): SessionState;
  getApplicationContext(): Record<string, unknown>;
  getReceivedApplicationContext(): Record<string, unknown>;
  isSupported(): boolean;

  // Lifecycle
  activate(): Promise<ActivationState>;

  // Messaging
  sendMessage(message: Record<string, unknown>): Promise<Record<string, unknown>>;
  sendMessageData(base64Data: string): Promise<string>;
  replyToMessage(replyId: string, reply: Record<string, unknown>): void;
  replyToMessageData(replyId: string, base64Data: string): void;

  // Application Context
  updateApplicationContext(context: Record<string, unknown>): Promise<void>;

  // User Info Transfer
  transferUserInfo(userInfo: Record<string, unknown>): UserInfoTransferInfo;
  transferCurrentComplicationUserInfo(userInfo: Record<string, unknown>): UserInfoTransferInfo;
  getOutstandingUserInfoTransfers(): UserInfoTransferInfo[];

  // File Transfer
  transferFile(url: string, metadata?: Record<string, unknown>): FileTransferInfo;
  getOutstandingFileTransfers(): FileTransferInfo[];
}

/**
 * The native ExpoWatchConnectivity module instance.
 * Use this for direct low-level access to the native API.
 */
export default requireNativeModule<ExpoWatchConnectivityModuleType>('ExpoWatchConnectivity');

