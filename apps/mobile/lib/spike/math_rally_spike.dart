// Math Rally WebView spike (MR1 step 11). Branch spike/math-rally-webview only: never merged.
//
// Serves the embed build (assets/math_rally/) from an app-internal origin:
//   Android: WebViewAssetLoader, https://appassets.androidplatform.net/assets/flutter_assets/assets/math_rally/index.html
//   iOS:     custom scheme dashden-game://app/index.html, answered from the Flutter asset bundle
// Bridge: the game calls the JS handler `mathRally`; the app answers with window.mathRallyReceive(text).
// Dev files from the game (frame CSVs, violations, loader test) are saved to the app's Documents folder
// and logged with the prefix MRSPIKE so they can be read from `flutter run` / logcat / devicectl.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:path_provider/path_provider.dart';

const _scheme = 'dashden-game';

const _loaderTestJs = r'''
const out = {};
for (const f of ['atlas.png', 'atlas.json', 'sfx/chime.wav', 'missing-file.png']) {
  const t0 = performance.now();
  out[f] = await new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open('GET', f);
    x.timeout = 5000;
    x.onload = () => resolve('status ' + x.status + ', ' + (x.getResponseHeader('content-type') || 'no type') + ', ' + (x.response ? x.response.length : 0) + ' chars');
    x.onerror = () => resolve('network error after ' + Math.round(performance.now() - t0) + ' ms');
    x.ontimeout = () => resolve('timeout after ' + Math.round(performance.now() - t0) + ' ms');
    x.send();
  });
}
return JSON.stringify(out);
''';
const _assetRoot = 'assets/math_rally';

void spikeLog(String line) => debugPrint('MRSPIKE $line');

String contentTypeFor(String path) {
  final ext = path.split('.').last.toLowerCase();
  return const {
        'html': 'text/html',
        'js': 'text/javascript',
        'css': 'text/css',
        'json': 'application/json',
        'png': 'image/png',
        'wav': 'audio/wav',
        'mp3': 'audio/mpeg',
        'ogg': 'audio/ogg',
        'woff2': 'font/woff2',
      }[ext] ??
      'application/octet-stream';
}

class MathRallySpikeScreen extends StatefulWidget {
  const MathRallySpikeScreen({super.key, this.raceAsset = 'assets/math_rally_spike/slice-hard.json'});
  final String raceAsset;

  @override
  State<MathRallySpikeScreen> createState() => _MathRallySpikeScreenState();
}

class _MathRallySpikeScreenState extends State<MathRallySpikeScreen> with WidgetsBindingObserver {
  InAppWebViewController? _web;
  bool _ready = false;
  bool _paused = false;
  String? _stopped;
  int _readyCount = 0;
  bool _finished = false;
  DateTime? _backAskedAt;
  Timer? _readyTimer;

  WebUri get _startUrl => Platform.isAndroid
      ? WebUri('https://appassets.androidplatform.net/assets/flutter_assets/$_assetRoot/index.html')
      : WebUri('$_scheme://app/index.html');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _readyTimer = Timer(const Duration(seconds: 20), () {
      if (!_ready && mounted) setState(() => _stopped = 'The race could not load.');
      spikeLog('ready timeout fired=${!_ready}');
    });
  }

  @override
  void dispose() {
    _readyTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && _ready) _send({'v': 1, 'type': 'pause'});
  }

  Future<void> _send(Map<String, Object?> message) async {
    final text = jsonEncode(message);
    await _web?.evaluateJavascript(source: 'window.mathRallyReceive(${jsonEncode(text)})');
  }

  Future<void> _onGameMessage(String text) async {
    final m = jsonDecode(text) as Map<String, dynamic>;
    spikeLog('game->host ${m['type']} ${m['type'] == 'raceFinished' ? '' : text}');
    switch (m['type']) {
      case 'ready':
        _readyCount++;
        _ready = true;
        final race = jsonDecode(await rootBundle.loadString(widget.raceAsset));
        await _send({
          'v': 1,
          'type': 'init',
          'mode': 'scored',
          'difficulty': race['difficulty'],
          'language': 'en',
          'sound': true,
          'reducedMotion': false,
          'touchUi': true,
          'race': race,
        });
      case 'pauseChanged':
        setState(() => _paused = m['paused'] == true);
        if (!_paused) _backAskedAt = null;
      case 'raceFinished':
        _finished = true;
        spikeLog('raceFinished correct=${m['correctCount']} timeMs=${m['raceTimeMs']}');
      case 'error':
        setState(() => _stopped = _ready ? 'The race stopped unexpectedly.' : 'The race could not load.');
    }
  }

  Future<void> _onDevFile(String payload) async {
    final f = jsonDecode(payload) as Map<String, dynamic>;
    // Every WebView starts at run 1, so a timestamp keeps one race from overwriting the last.
    final stamp = DateTime.now().toIso8601String().substring(0, 19).replaceAll(':', '');
    final name = '$stamp-${(f['name'] as String).replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_')}';
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/math-rally-spike/$name');
    await file.parent.create(recursive: true);
    await file.writeAsString(f['content'] as String);
    final content = f['content'] as String;
    spikeLog('devfile $name ${content.length} bytes -> ${file.path}');
    if (!name.endsWith('.csv')) spikeLog('devfile-content $name ${content.replaceAll('\n', ' ')}');
  }

  Future<CustomSchemeResponse?> _serveCustomScheme(WebResourceRequest request) async {
    final path = request.url.path.isEmpty || request.url.path == '/' ? '/index.html' : request.url.path;
    final asset = '$_assetRoot$path';
    try {
      final bytes = await rootBundle.load(asset);
      final data = bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes);
      spikeLog('scheme 200 $path ${data.length} bytes');
      return CustomSchemeResponse(data: data, contentType: contentTypeFor(path), contentEncoding: 'utf-8');
    } catch (_) {
      spikeLog('scheme missing $path');
      return null; // the plugin has no status code; this is what a missing file looks like (U19)
    }
  }

  // Android Back and the race-stopped overlay both leave the screen (AC-48.2).
  // Racing: the first Back pauses. A second Back, or a pause the game has not confirmed within 1 s,
  // leaves (iteration 4 fallback, AC-48.3). Loading, finished and stopped: Back leaves at once.
  Future<bool> _onBack() async {
    if (_stopped != null || !_ready || _finished) return true;
    if (_paused) return true;
    final asked = _backAskedAt;
    if (asked != null && DateTime.now().difference(asked) < const Duration(seconds: 5)) return true;
    _backAskedAt = DateTime.now();
    await _send({'v': 1, 'type': 'pause'});
    Timer(const Duration(seconds: 1), () {
      if (mounted && !_paused && _backAskedAt != null) spikeLog('pause not confirmed within 1 s; next Back leaves');
    });
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _onBack() && context.mounted) Navigator.of(context).pop(); // pop() skips PopScope; maybePop() would re-enter this handler
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF8FD3FF),
        body: Stack(
          children: [
            InAppWebView(
              initialUrlRequest: URLRequest(url: _startUrl),
              initialSettings: InAppWebViewSettings(
                // Hardening (tech-stack decisions Section 2, item 5)
                javaScriptEnabled: true,
                allowFileAccess: false,
                allowContentAccess: false,
                allowFileAccessFromFileURLs: false,
                allowUniversalAccessFromFileURLs: false,
                mixedContentMode: MixedContentMode.MIXED_CONTENT_NEVER_ALLOW,
                thirdPartyCookiesEnabled: false,
                geolocationEnabled: false,
                supportZoom: false,
                builtInZoomControls: false,
                disableContextMenu: true,
                disableLongPressContextMenuOnLinks: true,
                allowsLinkPreview: false,
                isInspectable: kDebugMode,
                mediaPlaybackRequiresUserGesture: false,
                allowsInlineMediaPlayback: true,
                transparentBackground: false,
                resourceCustomSchemes: const [_scheme],
                // Android only: on iOS 6.2.0-beta.3 throws UnimplementedError when the handler is built.
                webViewAssetLoader: Platform.isAndroid
                    ? WebViewAssetLoader(pathHandlers: [AssetsPathHandler(path: '/assets/')])
                    : null,
                useHybridComposition: !const bool.fromEnvironment('MR_TEXTURE_LAYER'),
              ),
              onWebViewCreated: (c) {
                _web = c;
                c.addJavaScriptHandler(handlerName: 'mathRally', callback: (args) => _onGameMessage(args.first as String));
                c.addJavaScriptHandler(handlerName: 'mathRallyDev', callback: (args) => _onDevFile(args.first as String));
              },
              onLoadResourceWithCustomScheme: (c, request) => _serveCustomScheme(request),
              shouldOverrideUrlLoading: (c, action) async {
                final url = action.request.url;
                final ok = url != null &&
                    (url.scheme == _scheme || (url.host == 'appassets.androidplatform.net' && url.scheme == 'https'));
                if (!ok) spikeLog('navigation blocked $url');
                return ok ? NavigationActionPolicy.ALLOW : NavigationActionPolicy.CANCEL;
              },
              onConsoleMessage: (c, m) => spikeLog('console ${m.messageLevel} ${m.message}'),
              onReceivedError: (c, r, e) => spikeLog('loaderror ${r.url} ${e.type} ${e.description}'),
              onReceivedHttpError: (c, r, res) => spikeLog('httperror ${r.url} ${res.statusCode}'),
              onPermissionRequest: (c, r) async =>
                  PermissionResponse(resources: r.resources, action: PermissionResponseAction.DENY),
              onRenderProcessGone: (c, d) => setState(() => _stopped = 'The race stopped unexpectedly.'),
              onWebContentProcessDidTerminate: (c) => setState(() => _stopped = 'The race stopped unexpectedly.'),
            ),
            if (_stopped != null)
              Positioned.fill(
                child: ColoredBox(
                  color: const Color(0xCC0F172A),
                  child: Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_stopped!, key: const Key('mr-spike-stopped'), style: const TextStyle(color: Colors.white, fontSize: 22)),
                      const SizedBox(height: 16),
                      FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Back')),
                    ]),
                  ),
                ),
              ),
            // Spike controls (gate builds): fault trigger, loader test, violations dump.
            Positioned(
              right: 8,
              top: MediaQuery.of(context).padding.top + 64,
              child: Column(children: [
                _spikeButton('Fault', () => _web?.evaluateJavascript(source: 'window.mathRallyFault && window.mathRallyFault()')),
                // Runs its own XHRs with a 5 s timeout: on iOS a null scheme answer never completes the
                // request, and evaluateJavascript cannot return the game's Promise.
                _spikeButton('Loader test', () async {
                  final r = await _web?.callAsyncJavaScript(functionBody: _loaderTestJs);
                  final out = '${r?.value ?? r?.error}';
                  spikeLog('loader-test $out');
                  final dir = await getApplicationDocumentsDirectory();
                  final file = File('${dir.path}/math-rally-spike/loader-test.json');
                  await file.parent.create(recursive: true);
                  await file.writeAsString(out);
                }),
                _spikeButton('Reset quality', () async {
                  await _web?.evaluateJavascript(source: "localStorage.removeItem('mathRally.quality'); 'ok'");
                  spikeLog('quality reset');
                }),
                _spikeButton('Violations', () async {
                  final v = await _web?.evaluateJavascript(source: 'window.mathRallyViolations && window.mathRallyViolations()');
                  spikeLog('violations $v readyCount=$_readyCount');
                }),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _spikeButton(String label, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: ElevatedButton(key: Key('mr-spike-${label.toLowerCase().replaceAll(' ', '-')}'), onPressed: onTap, child: Text(label)),
      );
}

/// Spike entry: `flutter run --dart-define=MR_SPIKE=true` opens straight into the spike screen.
class MathRallySpikeApp extends StatelessWidget {
  const MathRallySpikeApp({super.key});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              FilledButton(
                key: const Key('mr-spike-open-hard'),
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MathRallySpikeScreen())),
                child: const Text('Math Rally spike: Hard race'),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => const MathRallySpikeScreen(raceAsset: 'assets/math_rally_spike/slice-easy.json'))),
                child: const Text('Easy race'),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
