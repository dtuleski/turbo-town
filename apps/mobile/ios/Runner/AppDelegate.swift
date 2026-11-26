import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private let push = PushBridge()

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Notification taps (also the one that launched the app) arrive here.
    UNUserNotificationCenter.current().delegate = self
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    push.attach(messenger: engineBridge.applicationRegistrar.messenger())
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    push.didRegister(deviceToken: deviceToken)
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    push.didFailToRegister()
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }

  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    push.didTap(userInfo: response.notification.request.content.userInfo)
    completionHandler()
  }

  // Show the banner while the app is open too.
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .list, .sound])
  }
}

/// Method channel `app.dashden/push` (M5). Dart calls `requestPermission`,
/// `getToken` (APNs token as hex, nil without permission), `getTimeZone`
/// (IANA id) and `takeLaunchTap`; taps are sent to Dart as `onTap` with the
/// payload's `route`. A tap that comes before Dart is ready (cold start) is
/// kept until `takeLaunchTap`. Tokens are never logged.
final class PushBridge {
  private var channel: FlutterMethodChannel?
  private var token: String?
  private var pendingTokenResults: [FlutterResult] = []
  private var pendingTap: [String: Any]?
  private var dartReady = false

  func attach(messenger: FlutterBinaryMessenger) {
    let channel = FlutterMethodChannel(name: "app.dashden/push", binaryMessenger: messenger)
    channel.setMethodCallHandler { [weak self] call, result in
      self?.handle(call, result: result)
    }
    self.channel = channel
  }

  private func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "requestPermission":
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        DispatchQueue.main.async {
          if granted { UIApplication.shared.registerForRemoteNotifications() }
          result(granted)
        }
      }
    case "getToken":
      UNUserNotificationCenter.current().getNotificationSettings { settings in
        DispatchQueue.main.async {
          let allowed: [UNAuthorizationStatus] = [.authorized, .provisional, .ephemeral]
          guard allowed.contains(settings.authorizationStatus) else {
            result(nil)
            return
          }
          if let token = self.token {
            result(token)
            return
          }
          self.pendingTokenResults.append(result)
          UIApplication.shared.registerForRemoteNotifications()
        }
      }
    case "getTimeZone":
      result(TimeZone.current.identifier)
    case "takeLaunchTap":
      dartReady = true
      result(pendingTap)
      pendingTap = nil
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  func didRegister(deviceToken: Data) {
    let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
    token = hex
    flushTokenResults(hex)
  }

  func didFailToRegister() {
    flushTokenResults(nil)
  }

  private func flushTokenResults(_ value: String?) {
    let results = pendingTokenResults
    pendingTokenResults = []
    for result in results { result(value) }
  }

  func didTap(userInfo: [AnyHashable: Any]) {
    var payload: [String: Any] = [:]
    if let route = userInfo["route"] as? String { payload["route"] = route }
    if dartReady, let channel = channel {
      channel.invokeMethod("onTap", arguments: payload)
    } else {
      pendingTap = payload
    }
  }
}
