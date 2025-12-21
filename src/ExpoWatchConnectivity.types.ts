/**
 * WatchConnectivity Types
 *
 * Comprehensive TypeScript types for Apple's WatchConnectivity framework.
 * These types mirror the native WCSession API for type-safe communication
 * between React Native and Apple Watch apps.
 */

// ============================================================================
// Session State Types
// ============================================================================

/**
 * Represents the activation state of the WCSession.
 * - `notActivated`: Session has not been activated yet
 * - `inactive`: Session is transitioning between active states
 * - `activated`: Session is fully activated and ready for communication
 */
export type ActivationState = 'notActivated' | 'inactive' | 'activated';

/**
 * Complete session state information from WCSession.
 * All properties are derived from the native WCSession instance.
 */
export interface SessionState {
  /** Whether WatchConnectivity is supported on this device */
  isSupported: boolean;
  /** Whether an Apple Watch is paired with this iPhone */
  isPaired: boolean;
  /** Whether the companion Watch app is installed */
  isWatchAppInstalled: boolean;
  /** Whether the Watch is currently reachable for live messaging */
  isReachable: boolean;
  /** Current activation state of the session */
  activationState: ActivationState;
  /** Whether there is content pending transfer to the Watch */
  hasContentPending: boolean;
  /** Whether the companion app is in the complication on the active watch face */
  isComplicationEnabled: boolean;
  /** Remaining number of complication user info transfers available today */
  remainingComplicationUserInfoTransfers: number;
  /** Directory URL for storing Watch-specific data */
  watchDirectoryURL: string | null;
}

// ============================================================================
// Transfer Types
// ============================================================================

/**
 * Information about an ongoing or completed file transfer.
 */
export interface FileTransferInfo {
  /** Unique identifier for this transfer */
  id: string;
  /** Local file URL being transferred */
  url: string;
  /** Optional metadata dictionary sent with the file */
  metadata?: Record<string, unknown>;
  /** Transfer progress from 0.0 to 1.0 */
  progress: number;
  /** Whether the transfer is currently in progress */
  isTransferring: boolean;
}

/**
 * Information about an ongoing or completed user info transfer.
 */
export interface UserInfoTransferInfo {
  /** Unique identifier for this transfer */
  id: string;
  /** The user info dictionary being transferred */
  userInfo: Record<string, unknown>;
  /** Whether the transfer is currently in progress */
  isTransferring: boolean;
  /** Whether this is a complication user info transfer */
  isCurrentComplicationInfo: boolean;
}

// ============================================================================
// Event Payload Types
// ============================================================================

/**
 * Payload for message received events.
 * If `replyId` is present, the sender expects a reply via `replyToMessage()`.
 */
export interface MessageReceivedEvent {
  /** The message dictionary received from the Watch */
  message: Record<string, unknown>;
  /** Reply handler ID - if present, sender expects a reply */
  replyId?: string;
}

/**
 * Payload for message data received events (raw Data transfer).
 */
export interface MessageDataReceivedEvent {
  /** Base64 encoded data received from the Watch */
  data: string;
  /** Reply handler ID - if present, sender expects a reply */
  replyId?: string;
}

/**
 * Payload for reachability change events.
 */
export interface ReachabilityChangedEvent {
  /** Whether the Watch is currently reachable */
  isReachable: boolean;
}

/**
 * Payload for application context received events.
 */
export interface ApplicationContextReceivedEvent {
  /** The latest application context dictionary */
  applicationContext: Record<string, unknown>;
}

/**
 * Payload for user info received events.
 */
export interface UserInfoReceivedEvent {
  /** The user info dictionary received */
  userInfo: Record<string, unknown>;
}

/**
 * Payload for file received events.
 */
export interface FileReceivedEvent {
  /** Local URL where the received file is stored */
  url: string;
  /** Optional metadata sent with the file */
  metadata?: Record<string, unknown>;
}

/**
 * Payload for file transfer progress events.
 */
export interface FileTransferProgressEvent extends FileTransferInfo {}

/**
 * Payload for file transfer completion events.
 */
export interface FileTransferCompletedEvent extends FileTransferInfo {
  /** Error message if the transfer failed */
  error?: string;
}

/**
 * Payload for user info transfer completion events.
 */
export interface UserInfoTransferCompletedEvent extends UserInfoTransferInfo {
  /** Error message if the transfer failed */
  error?: string;
}

/**
 * Payload for session state change events.
 */
export interface SessionStateChangedEvent extends SessionState {}

/**
 * Payload for activation completion events.
 */
export interface ActivationDidCompleteEvent {
  /** The resulting activation state */
  activationState: ActivationState;
  /** Error message if activation failed */
  error?: string;
}

// ============================================================================
// Module Event Map
// ============================================================================

/**
 * Map of all events emitted by the ExpoWatchConnectivity module.
 * Used for type-safe event subscription.
 */
export type WatchConnectivityEvents = {
  onSessionStateChanged: (event: SessionStateChangedEvent) => void;
  onReachabilityChanged: (event: ReachabilityChangedEvent) => void;
  onActivationDidComplete: (event: ActivationDidCompleteEvent) => void;
  onMessageReceived: (event: MessageReceivedEvent) => void;
  onMessageDataReceived: (event: MessageDataReceivedEvent) => void;
  onApplicationContextReceived: (event: ApplicationContextReceivedEvent) => void;
  onUserInfoReceived: (event: UserInfoReceivedEvent) => void;
  onFileReceived: (event: FileReceivedEvent) => void;
  onFileTransferProgress: (event: FileTransferProgressEvent) => void;
  onFileTransferCompleted: (event: FileTransferCompletedEvent) => void;
  onUserInfoTransferCompleted: (event: UserInfoTransferCompletedEvent) => void;
  [key: string]: (event: any) => void;
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes that may be returned by WatchConnectivity operations.
 */
export type WatchConnectivityErrorCode =
  | 'E_NOT_SUPPORTED'
  | 'E_NOT_PAIRED'
  | 'E_NOT_REACHABLE'
  | 'E_SESSION_NOT_ACTIVATED'
  | 'E_SEND_FAILED'
  | 'E_UPDATE_FAILED'
  | 'E_TRANSFER_FAILED'
  | 'E_FILE_NOT_FOUND'
  | 'E_REPLY_EXPIRED'
  | 'E_UNKNOWN';

/**
 * Error object returned by failed WatchConnectivity operations.
 */
export interface WatchConnectivityError {
  code: WatchConnectivityErrorCode;
  message: string;
  nativeError?: string;
}

