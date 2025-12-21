/**
 * Example watchOS App Implementation
 *
 * This shows how to implement the Watch side of WatchConnectivity
 * in a SwiftUI watchOS app created with @bacons/expo-apple-targets.
 *
 * Place this in your targets/watch/ directory.
 */

import SwiftUI
import WatchConnectivity

// MARK: - Watch Connectivity Manager

/// Singleton manager for WatchConnectivity on the Watch side.
/// Handles all communication with the paired iPhone app.
@MainActor
class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    @Published var isReachable = false
    @Published var receivedMessage: [String: Any]?
    @Published var applicationContext: [String: Any] = [:]
    
    private var session: WCSession?
    
    override init() {
        super.init()
        
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }
    
    // MARK: - Send Methods
    
    /// Send a message to the iPhone and get a reply.
    /// Only works when isReachable is true.
    func sendMessage(_ message: [String: Any]) async throws -> [String: Any] {
        guard let session = session, session.isReachable else {
            throw WatchConnectivityError.notReachable
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            session.sendMessage(message, replyHandler: { reply in
                continuation.resume(returning: reply)
            }, errorHandler: { error in
                continuation.resume(throwing: error)
            })
        }
    }
    
    /// Update the application context sent to the iPhone.
    /// Works even when the iPhone is not reachable.
    func updateApplicationContext(_ context: [String: Any]) throws {
        try session?.updateApplicationContext(context)
    }
    
    /// Transfer user info to the iPhone (queued, FIFO).
    func transferUserInfo(_ userInfo: [String: Any]) {
        session?.transferUserInfo(userInfo)
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        Task { @MainActor in
            self.isReachable = session.isReachable
        }
    }
    
    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            self.isReachable = session.isReachable
        }
    }
    
    // Receive messages from iPhone
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            self.receivedMessage = message
            self.handleMessage(message)
        }
    }
    
    nonisolated func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        Task { @MainActor in
            self.receivedMessage = message
            let reply = self.handleMessageWithReply(message)
            replyHandler(reply)
        }
    }
    
    // Receive application context from iPhone
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            self.applicationContext = applicationContext
        }
    }
    
    // Receive user info from iPhone
    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        Task { @MainActor in
            self.handleUserInfo(userInfo)
        }
    }
    
    // MARK: - Message Handlers
    
    @MainActor
    private func handleMessage(_ message: [String: Any]) {
        // Handle incoming message without reply
        print("Received message: \(message)")
    }
    
    @MainActor
    private func handleMessageWithReply(_ message: [String: Any]) -> [String: Any] {
        // Handle incoming message and return reply
        if let action = message["action"] as? String {
            switch action {
            case "ping":
                return ["status": "pong", "timestamp": Date().timeIntervalSince1970]
            case "getData":
                return ["data": "Hello from Watch!"]
            default:
                return ["status": "unknown_action"]
            }
        }
        return ["status": "ok"]
    }
    
    @MainActor
    private func handleUserInfo(_ userInfo: [String: Any]) {
        print("Received user info: \(userInfo)")
    }
}

// MARK: - Errors

enum WatchConnectivityError: Error, LocalizedError {
    case notReachable
    case notSupported
    
    var errorDescription: String? {
        switch self {
        case .notReachable:
            return "iPhone is not reachable"
        case .notSupported:
            return "WatchConnectivity is not supported"
        }
    }
}

// MARK: - Example SwiftUI View

struct ContentView: View {
    @StateObject private var connectivity = WatchConnectivityManager.shared
    @State private var lastReply: String = ""
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Connection Status
                HStack {
                    Circle()
                        .fill(connectivity.isReachable ? Color.green : Color.red)
                        .frame(width: 12, height: 12)
                    Text(connectivity.isReachable ? "Connected" : "Disconnected")
                        .font(.caption)
                }
                
                // Send Message Button
                Button("Ping iPhone") {
                    Task {
                        do {
                            let reply = try await connectivity.sendMessage(["action": "ping"])
                            lastReply = String(describing: reply)
                        } catch {
                            lastReply = "Error: \(error.localizedDescription)"
                        }
                    }
                }
                .disabled(!connectivity.isReachable)
                
                // Last Reply
                if !lastReply.isEmpty {
                    Text(lastReply)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                // Application Context
                if !connectivity.applicationContext.isEmpty {
                    VStack(alignment: .leading) {
                        Text("Context:")
                            .font(.caption)
                            .fontWeight(.bold)
                        ForEach(Array(connectivity.applicationContext.keys), id: \.self) { key in
                            Text("\(key): \(String(describing: connectivity.applicationContext[key] ?? "nil"))")
                                .font(.caption2)
                        }
                    }
                }
            }
            .padding()
        }
    }
}

// MARK: - App Entry Point

@main
struct WatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

