/**
 * React Hook for WatchConnectivity
 *
 * A comprehensive hook that manages WatchConnectivity state and subscriptions.
 * Designed for use with expo-apple-targets Watch apps.
 */

import {
  ApplicationContextReceivedEvent,
  FileReceivedEvent,
  MessageReceivedEvent,
  SessionState,
  UserInfoReceivedEvent,
  WatchConnectivity,
} from "@plevo/expo-watch-connectivity";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseWatchConnectivityOptions {
  /** Auto-activate session on mount (default: true) */
  autoActivate?: boolean;
  /** Callback when a message is received */
  onMessage?: (event: MessageReceivedEvent) => void;
  /** Callback when application context is received */
  onApplicationContext?: (event: ApplicationContextReceivedEvent) => void;
  /** Callback when user info is received */
  onUserInfo?: (event: UserInfoReceivedEvent) => void;
  /** Callback when a file is received */
  onFile?: (event: FileReceivedEvent) => void;
}

export interface UseWatchConnectivityResult {
  /** Whether WatchConnectivity is supported on this device */
  isSupported: boolean;
  /** Whether the session is activated and ready */
  isActivated: boolean;
  /** Whether an Apple Watch is paired */
  isPaired: boolean;
  /** Whether the Watch app is installed */
  isWatchAppInstalled: boolean;
  /** Whether the Watch is reachable for real-time messaging */
  isReachable: boolean;
  /** Full session state */
  sessionState: SessionState | null;
  /** Activation error if any */
  error: Error | null;
  /** Manually activate the session */
  activate: () => Promise<void>;
  /** Send a message and get a reply */
  sendMessage: (
    message: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  /** Update application context */
  updateContext: (context: Record<string, unknown>) => Promise<void>;
  /** Transfer user info */
  transferUserInfo: (userInfo: Record<string, unknown>) => void;
}

/**
 * Hook for managing WatchConnectivity in React components.
 *
 * @example
 * ```tsx
 * function WatchScreen() {
 *   const {
 *     isReachable,
 *     isPaired,
 *     sendMessage,
 *     updateContext,
 *   } = useWatchConnectivity({
 *     onMessage: ({ message, replyId }) => {
 *       console.log('Watch says:', message);
 *       if (replyId) {
 *         WatchConnectivity.replyToMessage(replyId, { received: true });
 *       }
 *     },
 *   });
 *
 *   const handlePing = async () => {
 *     if (isReachable) {
 *       const reply = await sendMessage({ action: 'ping' });
 *       console.log('Pong:', reply);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Paired: {isPaired ? 'Yes' : 'No'}</Text>
 *       <Text>Reachable: {isReachable ? 'Yes' : 'No'}</Text>
 *       <Button title="Ping Watch" onPress={handlePing} disabled={!isReachable} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useWatchConnectivity(
  options: UseWatchConnectivityOptions = {}
): UseWatchConnectivityResult {
  const {
    autoActivate = true,
    onMessage,
    onApplicationContext,
    onUserInfo,
    onFile,
  } = options;

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Store callbacks in refs to avoid re-subscribing
  const onMessageRef = useRef(onMessage);
  const onApplicationContextRef = useRef(onApplicationContext);
  const onUserInfoRef = useRef(onUserInfo);
  const onFileRef = useRef(onFile);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onApplicationContextRef.current = onApplicationContext;
    onUserInfoRef.current = onUserInfo;
    onFileRef.current = onFile;
  }, [onMessage, onApplicationContext, onUserInfo, onFile]);

  // Activation
  const activate = useCallback(async () => {
    try {
      setError(null);
      await WatchConnectivity.activate();
      setIsActivated(true);
      setSessionState(WatchConnectivity.sessionState);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  // Setup subscriptions
  useEffect(() => {
    const isSupported = WatchConnectivity.isSupported;
    if (!isSupported) {
      setSessionState({
        isSupported: false,
        isPaired: false,
        isWatchAppInstalled: false,
        isReachable: false,
        activationState: "notActivated",
        hasContentPending: false,
        isComplicationEnabled: false,
        remainingComplicationUserInfoTransfers: 0,
        watchDirectoryURL: null,
      });
      return;
    }

    // Auto-activate if enabled
    if (autoActivate) {
      activate();
    }

    // Subscribe to events
    const subscriptions = [
      WatchConnectivity.addSessionStateListener((event) => {
        setSessionState(event);
      }),
      WatchConnectivity.addReachabilityListener(() => {
        setSessionState(WatchConnectivity.sessionState);
      }),
      WatchConnectivity.addActivationListener((event) => {
        setIsActivated(event.activationState === "activated");
        if (event.error) {
          setError(new Error(event.error));
        }
      }),
      WatchConnectivity.addMessageListener((event) => {
        onMessageRef.current?.(event);
      }),
      WatchConnectivity.addApplicationContextListener((event) => {
        onApplicationContextRef.current?.(event);
      }),
      WatchConnectivity.addUserInfoListener((event) => {
        onUserInfoRef.current?.(event);
      }),
      WatchConnectivity.addFileListener((event) => {
        onFileRef.current?.(event);
      }),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [autoActivate, activate]);

  // Wrapped methods
  const sendMessage = useCallback(async (message: Record<string, unknown>) => {
    return WatchConnectivity.sendMessage(message);
  }, []);

  const updateContext = useCallback(
    async (context: Record<string, unknown>) => {
      return WatchConnectivity.updateApplicationContext(context);
    },
    []
  );

  const transferUserInfo = useCallback((userInfo: Record<string, unknown>) => {
    WatchConnectivity.transferUserInfo(userInfo);
  }, []);

  return {
    isSupported: sessionState?.isSupported ?? false,
    isActivated,
    isPaired: sessionState?.isPaired ?? false,
    isWatchAppInstalled: sessionState?.isWatchAppInstalled ?? false,
    isReachable: sessionState?.isReachable ?? false,
    sessionState,
    error,
    activate,
    sendMessage,
    updateContext,
    transferUserInfo,
  };
}

export default useWatchConnectivity;
