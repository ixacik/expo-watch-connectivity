import { type EventSubscription } from 'expo';
import ExpoWatchConnectivityModule from './ExpoWatchConnectivityModule';
import type {
  SessionState,
  ActivationState,
  FileTransferInfo,
  UserInfoTransferInfo,
  MessageReceivedEvent,
  MessageDataReceivedEvent,
  ReachabilityChangedEvent,
  ApplicationContextReceivedEvent,
  UserInfoReceivedEvent,
  FileReceivedEvent,
  FileTransferProgressEvent,
  FileTransferCompletedEvent,
  UserInfoTransferCompletedEvent,
  SessionStateChangedEvent,
  ActivationDidCompleteEvent,
} from './ExpoWatchConnectivity.types';

// Re-export all types
export * from './ExpoWatchConnectivity.types';

// Re-export the native module for advanced use cases
export { ExpoWatchConnectivityModule };

/**
 * WatchConnectivity API
 *
 * A clean, declarative API for communicating between React Native and Apple Watch apps.
 * Wraps Apple's WatchConnectivity framework with type-safe TypeScript bindings.
 *
 * @example
 * ```typescript
 * import { WatchConnectivity } from 'expo-watch-connectivity';
 *
 * // Activate session
 * await WatchConnectivity.activate();
 *
 * // Send a message when reachable
 * if (WatchConnectivity.sessionState.isReachable) {
 *   const reply = await WatchConnectivity.sendMessage({ action: 'ping' });
 *   console.log('Watch replied:', reply);
 * }
 *
 * // Listen for incoming messages
 * const subscription = WatchConnectivity.addMessageListener(({ message, replyId }) => {
 *   console.log('Received:', message);
 *   if (replyId) {
 *     WatchConnectivity.replyToMessage(replyId, { ack: true });
 *   }
 * });
 *
 * // Cleanup
 * subscription.remove();
 * ```
 */
export const WatchConnectivity = {
  // ===========================================================================
  // State Properties
  // ===========================================================================

  /**
   * Whether WatchConnectivity is supported on this device.
   * Always returns `false` on Android.
   */
  get isSupported(): boolean {
    return ExpoWatchConnectivityModule.isSupported();
  },

  /**
   * Get the current session state including pairing status, reachability, and more.
   */
  get sessionState(): SessionState {
    return ExpoWatchConnectivityModule.getSessionState();
  },

  /**
   * Get the most recently sent application context.
   * This is the context that was last sent to the Watch.
   */
  get applicationContext(): Record<string, unknown> {
    return ExpoWatchConnectivityModule.getApplicationContext();
  },

  /**
   * Get the most recently received application context from the Watch.
   */
  get receivedApplicationContext(): Record<string, unknown> {
    return ExpoWatchConnectivityModule.getReceivedApplicationContext();
  },

  /**
   * Get the list of user info transfers that are still in progress.
   */
  get outstandingUserInfoTransfers(): UserInfoTransferInfo[] {
    return ExpoWatchConnectivityModule.getOutstandingUserInfoTransfers();
  },

  /**
   * Get the list of file transfers that are still in progress.
   */
  get outstandingFileTransfers(): FileTransferInfo[] {
    return ExpoWatchConnectivityModule.getOutstandingFileTransfers();
  },

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Activate the WatchConnectivity session.
   * Must be called before any other communication methods.
   *
   * @returns The activation state after activation begins
   * @throws {Error} If WatchConnectivity is not supported
   */
  activate(): Promise<ActivationState> {
    return ExpoWatchConnectivityModule.activate();
  },

  // ===========================================================================
  // Real-time Messaging (requires isReachable)
  // ===========================================================================

  /**
   * Send a message to the Watch and wait for a reply.
   * The Watch must be reachable for this to succeed.
   *
   * @param message - Dictionary to send to the Watch
   * @returns Promise resolving to the Watch's reply
   * @throws {Error} If Watch is not reachable or send fails
   */
  sendMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
    return ExpoWatchConnectivityModule.sendMessage(message);
  },

  /**
   * Send raw data to the Watch and wait for a reply.
   * The Watch must be reachable for this to succeed.
   *
   * @param data - Base64-encoded data to send
   * @returns Promise resolving to base64-encoded reply data
   * @throws {Error} If Watch is not reachable or send fails
   */
  sendMessageData(data: string): Promise<string> {
    return ExpoWatchConnectivityModule.sendMessageData(data);
  },

  /**
   * Reply to an incoming message that requested a reply.
   * Use the `replyId` from the `MessageReceivedEvent`.
   *
   * @param replyId - The reply ID from the received message event
   * @param reply - Dictionary to send as the reply
   */
  replyToMessage(replyId: string, reply: Record<string, unknown>): void {
    ExpoWatchConnectivityModule.replyToMessage(replyId, reply);
  },

  /**
   * Reply to an incoming data message that requested a reply.
   * Use the `replyId` from the `MessageDataReceivedEvent`.
   *
   * @param replyId - The reply ID from the received message event
   * @param data - Base64-encoded data to send as the reply
   */
  replyToMessageData(replyId: string, data: string): void {
    ExpoWatchConnectivityModule.replyToMessageData(replyId, data);
  },

  // ===========================================================================
  // Application Context (latest-wins, works in background)
  // ===========================================================================

  /**
   * Update the application context sent to the Watch.
   * Only the most recent context is kept; older updates are discarded.
   * Works even when the Watch is not reachable.
   *
   * @param context - Dictionary to send as the application context
   * @throws {Error} If the session is not activated
   */
  updateApplicationContext(context: Record<string, unknown>): Promise<void> {
    return ExpoWatchConnectivityModule.updateApplicationContext(context);
  },

  // ===========================================================================
  // User Info Transfer (queued FIFO, works in background)
  // ===========================================================================

  /**
   * Transfer user info to the Watch.
   * Unlike application context, all transfers are queued and delivered in order.
   * Works even when the Watch is not reachable.
   *
   * @param userInfo - Dictionary to transfer
   * @returns Transfer info including ID for tracking
   */
  transferUserInfo(userInfo: Record<string, unknown>): UserInfoTransferInfo {
    return ExpoWatchConnectivityModule.transferUserInfo(userInfo);
  },

  /**
   * Transfer user info for the current complication.
   * Uses the daily complication budget. Check `sessionState.remainingComplicationUserInfoTransfers`.
   *
   * @param userInfo - Dictionary to transfer for complication
   * @returns Transfer info including ID for tracking
   */
  transferCurrentComplicationUserInfo(userInfo: Record<string, unknown>): UserInfoTransferInfo {
    return ExpoWatchConnectivityModule.transferCurrentComplicationUserInfo(userInfo);
  },

  // ===========================================================================
  // File Transfer (works in background)
  // ===========================================================================

  /**
   * Transfer a file to the Watch.
   * Works even when the Watch is not reachable.
   *
   * @param url - Local file URL to transfer
   * @param metadata - Optional metadata dictionary to send with the file
   * @returns Transfer info including ID for tracking progress
   */
  transferFile(url: string, metadata?: Record<string, unknown>): FileTransferInfo {
    return ExpoWatchConnectivityModule.transferFile(url, metadata);
  },

  // ===========================================================================
  // Event Listeners
  // ===========================================================================

  /**
   * Listen for session state changes (pairing, installation, activation).
   */
  addSessionStateListener(
    callback: (event: SessionStateChangedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onSessionStateChanged', callback);
  },

  /**
   * Listen for reachability changes.
   * Reachability is required for real-time messaging.
   */
  addReachabilityListener(
    callback: (event: ReachabilityChangedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onReachabilityChanged', callback);
  },

  /**
   * Listen for activation completion.
   */
  addActivationListener(
    callback: (event: ActivationDidCompleteEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onActivationDidComplete', callback);
  },

  /**
   * Listen for incoming messages from the Watch.
   * If `replyId` is present, the Watch expects a reply via `replyToMessage()`.
   */
  addMessageListener(
    callback: (event: MessageReceivedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onMessageReceived', callback);
  },

  /**
   * Listen for incoming data messages from the Watch.
   * If `replyId` is present, the Watch expects a reply via `replyToMessageData()`.
   */
  addMessageDataListener(
    callback: (event: MessageDataReceivedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onMessageDataReceived', callback);
  },

  /**
   * Listen for application context updates from the Watch.
   */
  addApplicationContextListener(
    callback: (event: ApplicationContextReceivedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onApplicationContextReceived', callback);
  },

  /**
   * Listen for user info received from the Watch.
   */
  addUserInfoListener(
    callback: (event: UserInfoReceivedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onUserInfoReceived', callback);
  },

  /**
   * Listen for files received from the Watch.
   */
  addFileListener(callback: (event: FileReceivedEvent) => void): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onFileReceived', callback);
  },

  /**
   * Listen for file transfer progress updates.
   */
  addFileTransferProgressListener(
    callback: (event: FileTransferProgressEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onFileTransferProgress', callback);
  },

  /**
   * Listen for file transfer completion (success or failure).
   */
  addFileTransferCompletedListener(
    callback: (event: FileTransferCompletedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onFileTransferCompleted', callback);
  },

  /**
   * Listen for user info transfer completion (success or failure).
   */
  addUserInfoTransferCompletedListener(
    callback: (event: UserInfoTransferCompletedEvent) => void
  ): EventSubscription {
    return ExpoWatchConnectivityModule.addListener('onUserInfoTransferCompleted', callback);
  },
} as const;

export default WatchConnectivity;

