# @plevo/expo-watch-connectivity

Expo module wrapping Apple's WatchConnectivity framework for seamless communication between React Native/Expo apps and Apple Watch apps.

## Installation

```bash
npx expo install @plevo/expo-watch-connectivity
```

## Usage

```typescript
import { WatchConnectivity } from '@plevo/expo-watch-connectivity';

// Activate the session (required before any communication)
await WatchConnectivity.activate();

// Check if Watch is reachable for real-time messaging
if (WatchConnectivity.sessionState.isReachable) {
  const reply = await WatchConnectivity.sendMessage({ action: 'ping' });
  console.log('Watch replied:', reply);
}

// Listen for incoming messages
const subscription = WatchConnectivity.addMessageListener(({ message, replyId }) => {
  console.log('Received from Watch:', message);
  
  // Reply if the Watch expects a response
  if (replyId) {
    WatchConnectivity.replyToMessage(replyId, { status: 'ok' });
  }
});

// Background sync via application context (latest-wins)
await WatchConnectivity.updateApplicationContext({
  theme: 'dark',
  lastSync: Date.now(),
});

// Background transfer via user info (queued FIFO)
WatchConnectivity.transferUserInfo({ notification: 'New data available' });

// File transfer
WatchConnectivity.transferFile('/path/to/file.pdf', { name: 'Document' });

// Cleanup
subscription.remove();
```

## API Reference

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `isSupported` | `boolean` | Whether WatchConnectivity is supported (always `false` on Android) |
| `sessionState` | `SessionState` | Current session state including pairing, reachability, etc. |
| `applicationContext` | `Record<string, unknown>` | Most recently sent application context |
| `receivedApplicationContext` | `Record<string, unknown>` | Most recently received application context |
| `outstandingUserInfoTransfers` | `UserInfoTransferInfo[]` | Pending user info transfers |
| `outstandingFileTransfers` | `FileTransferInfo[]` | Pending file transfers |

### Methods

#### Lifecycle

- `activate(): Promise<ActivationState>` - Activate the WatchConnectivity session

#### Real-time Messaging (requires `isReachable`)

- `sendMessage(message): Promise<Record<string, unknown>>` - Send message and get reply
- `sendMessageData(base64Data): Promise<string>` - Send raw data and get reply
- `replyToMessage(replyId, reply): void` - Reply to an incoming message
- `replyToMessageData(replyId, base64Data): void` - Reply with raw data

#### Background Sync

- `updateApplicationContext(context): Promise<void>` - Update application context (latest-wins)
- `transferUserInfo(userInfo): UserInfoTransferInfo` - Queue user info transfer (FIFO)
- `transferCurrentComplicationUserInfo(userInfo): UserInfoTransferInfo` - Transfer for complications
- `transferFile(url, metadata?): FileTransferInfo` - Transfer a file

### Event Listeners

All listeners return an `EventSubscription` with a `.remove()` method for cleanup.

| Listener | Event Type | Description |
|----------|------------|-------------|
| `addSessionStateListener` | `SessionStateChangedEvent` | Session state changes |
| `addReachabilityListener` | `ReachabilityChangedEvent` | Reachability changes |
| `addActivationListener` | `ActivationDidCompleteEvent` | Activation completed |
| `addMessageListener` | `MessageReceivedEvent` | Message received |
| `addMessageDataListener` | `MessageDataReceivedEvent` | Data message received |
| `addApplicationContextListener` | `ApplicationContextReceivedEvent` | Context received |
| `addUserInfoListener` | `UserInfoReceivedEvent` | User info received |
| `addFileListener` | `FileReceivedEvent` | File received |
| `addFileTransferProgressListener` | `FileTransferProgressEvent` | Transfer progress |
| `addFileTransferCompletedListener` | `FileTransferCompletedEvent` | Transfer completed |
| `addUserInfoTransferCompletedListener` | `UserInfoTransferCompletedEvent` | User info transfer completed |

## Integration with expo-apple-targets

This module is designed to work seamlessly with [@bacons/expo-apple-targets](https://github.com/EvanBacon/expo-apple-targets) for Apple Watch app development.

### Shared App Groups

To share data between your main app and Watch app via `UserDefaults`:

**app.json:**
```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": ["group.com.yourapp.shared"]
      }
    }
  }
}
```

**targets/watch/expo-target.config.js:**
```javascript
module.exports = (config) => ({
  type: "watch",
  entitlements: {
    "com.apple.security.application-groups": 
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
```

## Platform Support

| Platform | Support |
|----------|---------|
| iOS | ✅ Full support |
| Android | ❌ Returns `isSupported: false` |
| Web | ❌ Not supported |

## License

MIT

