/**
 * Example React Native Screen
 *
 * Demonstrates full integration of expo-watch-connectivity
 * with a React Native / Expo app.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useWatchConnectivity } from './useWatchConnectivity';
import { WatchConnectivity, MessageReceivedEvent } from 'expo-watch-connectivity';

export function WatchConnectivityScreen() {
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  const addLog = (message: string) => {
    setMessageLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 49)]);
  };

  const handleMessage = (event: MessageReceivedEvent) => {
    addLog(`📥 Received: ${JSON.stringify(event.message)}`);

    // Auto-reply if replyId is present
    if (event.replyId) {
      WatchConnectivity.replyToMessage(event.replyId, {
        status: 'received',
        timestamp: Date.now(),
      });
      addLog(`↩️ Sent auto-reply`);
    }
  };

  const {
    isSupported,
    isActivated,
    isPaired,
    isWatchAppInstalled,
    isReachable,
    sessionState,
    error,
    sendMessage,
    updateContext,
    transferUserInfo,
  } = useWatchConnectivity({
    onMessage: handleMessage,
    onApplicationContext: (event) => {
      addLog(`📦 Context received: ${JSON.stringify(event.applicationContext)}`);
    },
    onUserInfo: (event) => {
      addLog(`ℹ️ User info received: ${JSON.stringify(event.userInfo)}`);
    },
    onFile: (event) => {
      addLog(`📁 File received: ${event.url}`);
    },
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      addLog(`📤 Sending: ${inputMessage}`);
      const reply = await sendMessage({ text: inputMessage, timestamp: Date.now() });
      addLog(`✅ Reply: ${JSON.stringify(reply)}`);
      setInputMessage('');
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handlePing = async () => {
    try {
      addLog(`🏓 Sending ping...`);
      const reply = await sendMessage({ action: 'ping' });
      addLog(`🏓 Pong received: ${JSON.stringify(reply)}`);
    } catch (err) {
      addLog(`❌ Ping failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleUpdateContext = async () => {
    try {
      const context = {
        theme: 'dark',
        lastSync: Date.now(),
        version: '1.0.0',
      };
      await updateContext(context);
      addLog(`📦 Context updated: ${JSON.stringify(context)}`);
    } catch (err) {
      addLog(`❌ Context update failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTransferUserInfo = () => {
    const userInfo = {
      notification: 'New data available',
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
    };
    transferUserInfo(userInfo);
    addLog(`📨 User info queued: ${JSON.stringify(userInfo)}`);
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>WatchConnectivity</Text>
        <Text style={styles.unsupported}>
          WatchConnectivity is only available on iOS
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>WatchConnectivity</Text>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusGrid}>
          <StatusItem label="Supported" value={isSupported} />
          <StatusItem label="Activated" value={isActivated} />
          <StatusItem label="Paired" value={isPaired} />
          <StatusItem label="App Installed" value={isWatchAppInstalled} />
          <StatusItem label="Reachable" value={isReachable} highlight />
        </View>
        {error && <Text style={styles.error}>Error: {error.message}</Text>}
        {sessionState?.isComplicationEnabled && (
          <Text style={styles.complication}>
            Complication enabled ({sessionState.remainingComplicationUserInfoTransfers} transfers remaining)
          </Text>
        )}
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Enter message..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity
            style={[styles.button, !isReachable && styles.buttonDisabled]}
            onPress={handleSendMessage}
            disabled={!isReachable}
          >
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, !isReachable && styles.buttonDisabled]}
            onPress={handlePing}
            disabled={!isReachable}
          >
            <Text style={styles.actionButtonText}>🏓 Ping</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, !isActivated && styles.buttonDisabled]}
            onPress={handleUpdateContext}
            disabled={!isActivated}
          >
            <Text style={styles.actionButtonText}>📦 Update Context</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, !isActivated && styles.buttonDisabled]}
            onPress={handleTransferUserInfo}
            disabled={!isActivated}
          >
            <Text style={styles.actionButtonText}>📨 Transfer Info</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Log Section */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Log</Text>
          <TouchableOpacity onPress={() => setMessageLog([])}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.logContainer}>
          {messageLog.length === 0 ? (
            <Text style={styles.logEmpty}>No messages yet</Text>
          ) : (
            messageLog.map((log, index) => (
              <Text key={index} style={styles.logItem}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function StatusItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statusItem}>
      <View
        style={[
          styles.statusDot,
          value ? styles.statusDotActive : styles.statusDotInactive,
          highlight && value && styles.statusDotHighlight,
        ]}
      />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  unsupported: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: '#4ade80',
  },
  statusDotInactive: {
    backgroundColor: '#666',
  },
  statusDotHighlight: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },
  complication: {
    color: '#60a5fa',
    fontSize: 12,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearButton: {
    color: '#3b82f6',
    fontSize: 14,
  },
  logContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  logEmpty: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  logItem: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
});

export default WatchConnectivityScreen;

