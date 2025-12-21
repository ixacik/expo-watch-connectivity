import ExpoModulesCore
import WatchConnectivity

/// Expo module wrapping Apple's WatchConnectivity framework.
/// Provides seamless communication between React Native and Apple Watch apps.
public class ExpoWatchConnectivityModule: Module {
  
  // MARK: - Properties
  
  private var session: WCSession? {
    return WCSession.isSupported() ? WCSession.default : nil
  }
  
  /// Delegate handler for WCSession events
  private lazy var sessionDelegate = WatchSessionDelegate(module: self)
  
  /// Pending reply handlers keyed by UUID
  private var pendingMessageReplies: [String: ([String: Any]) -> Void] = [:]
  private var pendingDataReplies: [String: (Data) -> Void] = [:]
  
  /// Lock for thread-safe access to pending replies
  private let replyLock = NSLock()
  
  // MARK: - Module Definition
  
  public func definition() -> ModuleDefinition {
    Name("ExpoWatchConnectivity")
    
    // MARK: Events
    
    Events(
      "onSessionStateChanged",
      "onReachabilityChanged",
      "onActivationDidComplete",
      "onMessageReceived",
      "onMessageDataReceived",
      "onApplicationContextReceived",
      "onUserInfoReceived",
      "onFileReceived",
      "onFileTransferProgress",
      "onFileTransferCompleted",
      "onUserInfoTransferCompleted"
    )
    
    // MARK: Lifecycle Hooks
    
    OnStartObserving {
      self.setupSession()
    }
    
    OnStopObserving {
      // Session delegate remains active for background transfers
    }
    
    // MARK: Sync Functions - State Getters
    
    Function("getSessionState") { () -> [String: Any] in
      return self.buildSessionState()
    }
    
    Function("getApplicationContext") { () -> [String: Any] in
      return self.session?.applicationContext ?? [:]
    }
    
    Function("getReceivedApplicationContext") { () -> [String: Any] in
      return self.session?.receivedApplicationContext ?? [:]
    }
    
    Function("isSupported") { () -> Bool in
      return WCSession.isSupported()
    }
    
    // MARK: Async Functions - Lifecycle
    
    AsyncFunction("activate") { (promise: Promise) in
      guard WCSession.isSupported() else {
        promise.reject("E_NOT_SUPPORTED", "WatchConnectivity is not supported on this device")
        return
      }
      
      self.setupSession()
      self.session?.activate()
      
      // Return current state immediately - activation completion comes via event
      promise.resolve(self.activationStateString(self.session?.activationState ?? .notActivated))
    }
    
    // MARK: Async Functions - Messaging
    
    AsyncFunction("sendMessage") { (message: [String: Any], promise: Promise) in
      guard let session = self.session else {
        promise.reject("E_NOT_SUPPORTED", "WatchConnectivity is not supported")
        return
      }
      
      guard session.activationState == .activated else {
        promise.reject("E_SESSION_NOT_ACTIVATED", "Session is not activated")
        return
      }
      
      guard session.isReachable else {
        promise.reject("E_NOT_REACHABLE", "Watch is not reachable")
        return
      }
      
      session.sendMessage(message, replyHandler: { reply in
        promise.resolve(reply)
      }, errorHandler: { error in
        promise.reject("E_SEND_FAILED", error.localizedDescription)
      })
    }
    
    AsyncFunction("sendMessageData") { (base64Data: String, promise: Promise) in
      guard let session = self.session else {
        promise.reject("E_NOT_SUPPORTED", "WatchConnectivity is not supported")
        return
      }
      
      guard session.activationState == .activated else {
        promise.reject("E_SESSION_NOT_ACTIVATED", "Session is not activated")
        return
      }
      
      guard session.isReachable else {
        promise.reject("E_NOT_REACHABLE", "Watch is not reachable")
        return
      }
      
      guard let data = Data(base64Encoded: base64Data) else {
        promise.reject("E_INVALID_DATA", "Invalid base64 data")
        return
      }
      
      session.sendMessageData(data, replyHandler: { replyData in
        promise.resolve(replyData.base64EncodedString())
      }, errorHandler: { error in
        promise.reject("E_SEND_FAILED", error.localizedDescription)
      })
    }
    
    // MARK: Sync Functions - Reply Handling
    
    Function("replyToMessage") { (replyId: String, reply: [String: Any]) in
      self.replyLock.lock()
      defer { self.replyLock.unlock() }
      
      if let handler = self.pendingMessageReplies.removeValue(forKey: replyId) {
        handler(reply)
      }
    }
    
    Function("replyToMessageData") { (replyId: String, base64Data: String) in
      self.replyLock.lock()
      defer { self.replyLock.unlock() }
      
      guard let data = Data(base64Encoded: base64Data) else { return }
      
      if let handler = self.pendingDataReplies.removeValue(forKey: replyId) {
        handler(data)
      }
    }
    
    // MARK: Async Functions - Application Context
    
    AsyncFunction("updateApplicationContext") { (context: [String: Any], promise: Promise) in
      guard let session = self.session else {
        promise.reject("E_NOT_SUPPORTED", "WatchConnectivity is not supported")
        return
      }
      
      guard session.activationState == .activated else {
        promise.reject("E_SESSION_NOT_ACTIVATED", "Session is not activated")
        return
      }
      
      do {
        try session.updateApplicationContext(context)
        promise.resolve(nil)
      } catch {
        promise.reject("E_UPDATE_FAILED", error.localizedDescription)
      }
    }
    
    // MARK: Sync Functions - User Info Transfer
    
    Function("transferUserInfo") { (userInfo: [String: Any]) -> [String: Any] in
      guard let transfer = self.session?.transferUserInfo(userInfo) else {
        return ["id": "", "userInfo": userInfo, "isTransferring": false, "isCurrentComplicationInfo": false]
      }
      return self.buildUserInfoTransferInfo(transfer)
    }
    
    Function("transferCurrentComplicationUserInfo") { (userInfo: [String: Any]) -> [String: Any] in
      guard let transfer = self.session?.transferCurrentComplicationUserInfo(userInfo) else {
        return ["id": "", "userInfo": userInfo, "isTransferring": false, "isCurrentComplicationInfo": true]
      }
      return self.buildUserInfoTransferInfo(transfer)
    }
    
    Function("getOutstandingUserInfoTransfers") { () -> [[String: Any]] in
      return self.session?.outstandingUserInfoTransfers.map { self.buildUserInfoTransferInfo($0) } ?? []
    }
    
    // MARK: Sync Functions - File Transfer
    
    Function("transferFile") { (url: String, metadata: [String: Any]?) -> [String: Any] in
      let fileURL = URL(fileURLWithPath: url)
      
      guard FileManager.default.fileExists(atPath: url) else {
        return ["id": "", "url": url, "progress": 0, "isTransferring": false, "error": "File not found"]
      }
      
      guard let transfer = self.session?.transferFile(fileURL, metadata: metadata) else {
        return ["id": "", "url": url, "progress": 0, "isTransferring": false]
      }
      
      return self.buildFileTransferInfo(transfer)
    }
    
    Function("getOutstandingFileTransfers") { () -> [[String: Any]] in
      return self.session?.outstandingFileTransfers.map { self.buildFileTransferInfo($0) } ?? []
    }
  }
  
  // MARK: - Private Helpers
  
  private func setupSession() {
    guard let session = self.session else { return }
    session.delegate = sessionDelegate
  }
  
  private func buildSessionState() -> [String: Any] {
    guard let session = self.session else {
      return [
        "isSupported": false,
        "isPaired": false,
        "isWatchAppInstalled": false,
        "isReachable": false,
        "activationState": "notActivated",
        "hasContentPending": false,
        "isComplicationEnabled": false,
        "remainingComplicationUserInfoTransfers": 0,
        "watchDirectoryURL": NSNull()
      ]
    }
    
    return [
      "isSupported": true,
      "isPaired": session.isPaired,
      "isWatchAppInstalled": session.isWatchAppInstalled,
      "isReachable": session.isReachable,
      "activationState": activationStateString(session.activationState),
      "hasContentPending": session.hasContentPending,
      "isComplicationEnabled": session.isComplicationEnabled,
      "remainingComplicationUserInfoTransfers": session.remainingComplicationUserInfoTransfers,
      "watchDirectoryURL": session.watchDirectoryURL?.absoluteString ?? NSNull()
    ]
  }
  
  private func activationStateString(_ state: WCSessionActivationState) -> String {
    switch state {
    case .notActivated:
      return "notActivated"
    case .inactive:
      return "inactive"
    case .activated:
      return "activated"
    @unknown default:
      return "notActivated"
    }
  }
  
  private func buildUserInfoTransferInfo(_ transfer: WCSessionUserInfoTransfer) -> [String: Any] {
    return [
      "id": ObjectIdentifier(transfer).hashValue.description,
      "userInfo": transfer.userInfo,
      "isTransferring": transfer.isTransferring,
      "isCurrentComplicationInfo": transfer.isCurrentComplicationInfo
    ]
  }
  
  private func buildFileTransferInfo(_ transfer: WCSessionFileTransfer) -> [String: Any] {
    return [
      "id": ObjectIdentifier(transfer).hashValue.description,
      "url": transfer.file.fileURL.absoluteString,
      "metadata": transfer.file.metadata ?? [:],
      "progress": transfer.progress.fractionCompleted,
      "isTransferring": transfer.isTransferring
    ]
  }
  
  // MARK: - Internal Event Dispatchers
  
  func dispatchSessionStateChanged() {
    sendEvent("onSessionStateChanged", buildSessionState())
  }
  
  func dispatchReachabilityChanged(_ isReachable: Bool) {
    sendEvent("onReachabilityChanged", ["isReachable": isReachable])
  }
  
  func dispatchActivationDidComplete(_ state: WCSessionActivationState, error: Error?) {
    var payload: [String: Any] = ["activationState": activationStateString(state)]
    if let error = error {
      payload["error"] = error.localizedDescription
    }
    sendEvent("onActivationDidComplete", payload)
  }
  
  func dispatchMessageReceived(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)?) {
    var payload: [String: Any] = ["message": message]
    
    if let handler = replyHandler {
      let replyId = UUID().uuidString
      replyLock.lock()
      pendingMessageReplies[replyId] = handler
      replyLock.unlock()
      payload["replyId"] = replyId
      
      // Auto-expire reply after 30 seconds
      DispatchQueue.main.asyncAfter(deadline: .now() + 30) { [weak self] in
        self?.replyLock.lock()
        self?.pendingMessageReplies.removeValue(forKey: replyId)
        self?.replyLock.unlock()
      }
    }
    
    sendEvent("onMessageReceived", payload)
  }
  
  func dispatchMessageDataReceived(_ data: Data, replyHandler: ((Data) -> Void)?) {
    var payload: [String: Any] = ["data": data.base64EncodedString()]
    
    if let handler = replyHandler {
      let replyId = UUID().uuidString
      replyLock.lock()
      pendingDataReplies[replyId] = handler
      replyLock.unlock()
      payload["replyId"] = replyId
      
      // Auto-expire reply after 30 seconds
      DispatchQueue.main.asyncAfter(deadline: .now() + 30) { [weak self] in
        self?.replyLock.lock()
        self?.pendingDataReplies.removeValue(forKey: replyId)
        self?.replyLock.unlock()
      }
    }
    
    sendEvent("onMessageDataReceived", payload)
  }
  
  func dispatchApplicationContextReceived(_ context: [String: Any]) {
    sendEvent("onApplicationContextReceived", ["applicationContext": context])
  }
  
  func dispatchUserInfoReceived(_ userInfo: [String: Any]) {
    sendEvent("onUserInfoReceived", ["userInfo": userInfo])
  }
  
  func dispatchFileReceived(url: URL, metadata: [String: Any]?) {
    var payload: [String: Any] = ["url": url.absoluteString]
    if let metadata = metadata {
      payload["metadata"] = metadata
    }
    sendEvent("onFileReceived", payload)
  }
  
  func dispatchFileTransferProgress(_ transfer: WCSessionFileTransfer) {
    sendEvent("onFileTransferProgress", buildFileTransferInfo(transfer))
  }
  
  func dispatchFileTransferCompleted(_ transfer: WCSessionFileTransfer, error: Error?) {
    var payload = buildFileTransferInfo(transfer)
    if let error = error {
      payload["error"] = error.localizedDescription
    }
    sendEvent("onFileTransferCompleted", payload)
  }
  
  func dispatchUserInfoTransferCompleted(_ transfer: WCSessionUserInfoTransfer, error: Error?) {
    var payload = buildUserInfoTransferInfo(transfer)
    if let error = error {
      payload["error"] = error.localizedDescription
    }
    sendEvent("onUserInfoTransferCompleted", payload)
  }
}

// MARK: - WCSessionDelegate

/// Separate delegate class to handle WCSession callbacks
private class WatchSessionDelegate: NSObject, WCSessionDelegate {
  
  weak var module: ExpoWatchConnectivityModule?
  
  init(module: ExpoWatchConnectivityModule) {
    self.module = module
    super.init()
  }
  
  // MARK: Required Delegate Methods
  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    module?.dispatchActivationDidComplete(activationState, error: error)
    module?.dispatchSessionStateChanged()
  }
  
  func sessionDidBecomeInactive(_ session: WCSession) {
    module?.dispatchSessionStateChanged()
  }
  
  func sessionDidDeactivate(_ session: WCSession) {
    module?.dispatchSessionStateChanged()
    // Reactivate for new watch pairing
    session.activate()
  }
  
  // MARK: Optional Delegate Methods - Reachability
  
  func sessionReachabilityDidChange(_ session: WCSession) {
    module?.dispatchReachabilityChanged(session.isReachable)
    module?.dispatchSessionStateChanged()
  }
  
  // MARK: Optional Delegate Methods - Watch State Changes
  
  func sessionWatchStateDidChange(_ session: WCSession) {
    module?.dispatchSessionStateChanged()
  }
  
  // MARK: Optional Delegate Methods - Messages
  
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    module?.dispatchMessageReceived(message, replyHandler: nil)
  }
  
  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    module?.dispatchMessageReceived(message, replyHandler: replyHandler)
  }
  
  func session(_ session: WCSession, didReceiveMessageData messageData: Data) {
    module?.dispatchMessageDataReceived(messageData, replyHandler: nil)
  }
  
  func session(_ session: WCSession, didReceiveMessageData messageData: Data, replyHandler: @escaping (Data) -> Void) {
    module?.dispatchMessageDataReceived(messageData, replyHandler: replyHandler)
  }
  
  // MARK: Optional Delegate Methods - Application Context
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    module?.dispatchApplicationContextReceived(applicationContext)
  }
  
  // MARK: Optional Delegate Methods - User Info
  
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    module?.dispatchUserInfoReceived(userInfo)
  }
  
  func session(_ session: WCSession, didFinish userInfoTransfer: WCSessionUserInfoTransfer, error: Error?) {
    module?.dispatchUserInfoTransferCompleted(userInfoTransfer, error: error)
  }
  
  // MARK: Optional Delegate Methods - File Transfer
  
  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    module?.dispatchFileReceived(url: file.fileURL, metadata: file.metadata)
  }
  
  func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
    module?.dispatchFileTransferCompleted(fileTransfer, error: error)
  }
}

