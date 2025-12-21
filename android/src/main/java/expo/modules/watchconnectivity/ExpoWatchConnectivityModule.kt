package expo.modules.watchconnectivity

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException

/**
 * Android stub for ExpoWatchConnectivity.
 * WatchConnectivity is an iOS-only framework; this module provides
 * clear error messages when called on Android.
 */
class ExpoWatchConnectivityModule : Module() {
  
  override fun definition() = ModuleDefinition {
    Name("ExpoWatchConnectivity")
    
    // Events (defined for API compatibility, but never emitted on Android)
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
    
    // State getters - return unsupported state
    Function("getSessionState") {
      return@Function mapOf(
        "isSupported" to false,
        "isPaired" to false,
        "isWatchAppInstalled" to false,
        "isReachable" to false,
        "activationState" to "notActivated",
        "hasContentPending" to false,
        "isComplicationEnabled" to false,
        "remainingComplicationUserInfoTransfers" to 0,
        "watchDirectoryURL" to null
      )
    }
    
    Function("getApplicationContext") {
      return@Function emptyMap<String, Any>()
    }
    
    Function("getReceivedApplicationContext") {
      return@Function emptyMap<String, Any>()
    }
    
    Function("isSupported") {
      return@Function false
    }
    
    // Lifecycle
    AsyncFunction("activate") {
      throw PlatformNotSupportedException()
    }
    
    // Messaging
    AsyncFunction("sendMessage") { _: Map<String, Any> ->
      throw PlatformNotSupportedException()
    }
    
    AsyncFunction("sendMessageData") { _: String ->
      throw PlatformNotSupportedException()
    }
    
    Function("replyToMessage") { _: String, _: Map<String, Any> ->
      // No-op on Android
    }
    
    Function("replyToMessageData") { _: String, _: String ->
      // No-op on Android
    }
    
    // Application Context
    AsyncFunction("updateApplicationContext") { _: Map<String, Any> ->
      throw PlatformNotSupportedException()
    }
    
    // User Info Transfer
    Function("transferUserInfo") { userInfo: Map<String, Any> ->
      return@Function mapOf(
        "id" to "",
        "userInfo" to userInfo,
        "isTransferring" to false,
        "isCurrentComplicationInfo" to false,
        "error" to "WatchConnectivity is not supported on Android"
      )
    }
    
    Function("transferCurrentComplicationUserInfo") { userInfo: Map<String, Any> ->
      return@Function mapOf(
        "id" to "",
        "userInfo" to userInfo,
        "isTransferring" to false,
        "isCurrentComplicationInfo" to true,
        "error" to "WatchConnectivity is not supported on Android"
      )
    }
    
    Function("getOutstandingUserInfoTransfers") {
      return@Function emptyList<Map<String, Any>>()
    }
    
    // File Transfer
    Function("transferFile") { url: String, _: Map<String, Any>? ->
      return@Function mapOf(
        "id" to "",
        "url" to url,
        "progress" to 0,
        "isTransferring" to false,
        "error" to "WatchConnectivity is not supported on Android"
      )
    }
    
    Function("getOutstandingFileTransfers") {
      return@Function emptyList<Map<String, Any>>()
    }
  }
}

/**
 * Exception thrown when WatchConnectivity methods are called on Android.
 */
class PlatformNotSupportedException : CodedException(
  code = "E_NOT_SUPPORTED",
  message = "WatchConnectivity is only available on iOS. Use Wear OS APIs for Android watch communication."
)

