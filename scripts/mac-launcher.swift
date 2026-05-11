import Cocoa
import Security
import WebKit

let appName = "{{APP_NAME}}"
let binaryName = "{{BINARY_NAME}}"
let keychainService = "local.starter.app.omniroute"
let omniRouteAuthCookieName = "auth_token"

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
	var window: NSWindow?
	var webView: WKWebView?
	var server: Process?
	var localAppURL: URL?
	var returnAfterOmniRouteLoginURL: URL?
	var omniRouteLoginActive = false

	func applicationDidFinishLaunching(_ notification: Notification) {
		setupMenu()
		startServer()
	}

	func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
		true
	}

	func applicationWillTerminate(_ notification: Notification) {
		server?.terminate()
	}

	func setupMenu() {
		let mainMenu = NSMenu()
		NSApp.mainMenu = mainMenu

		let appMenuItem = NSMenuItem()
		mainMenu.addItem(appMenuItem)

		let appMenu = NSMenu(title: appName)
		appMenuItem.submenu = appMenu
		appMenu.addItem(withTitle: "About \(appName)", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
		appMenu.addItem(NSMenuItem.separator())
		appMenu.addItem(withTitle: "Hide \(appName)", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
		let hideOthers = appMenu.addItem(withTitle: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
		hideOthers.keyEquivalentModifierMask = [.command, .option]
		appMenu.addItem(withTitle: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
		appMenu.addItem(NSMenuItem.separator())
		appMenu.addItem(withTitle: "Quit \(appName)", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

		let editMenuItem = NSMenuItem()
		mainMenu.addItem(editMenuItem)

		let editMenu = NSMenu(title: "Edit")
		editMenuItem.submenu = editMenu
		editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
		editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
		editMenu.addItem(NSMenuItem.separator())
		editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
		editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
		editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
		editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

		let windowMenuItem = NSMenuItem()
		mainMenu.addItem(windowMenuItem)

		let windowMenu = NSMenu(title: "Window")
		windowMenuItem.submenu = windowMenu
		NSApp.windowsMenu = windowMenu
		windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
		windowMenu.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
	}

	func startServer() {
		let appDir = Bundle.main.bundleURL
			.appendingPathComponent("Contents")
			.appendingPathComponent("MacOS")
		let binary = appDir.appendingPathComponent(binaryName)
		guard FileManager.default.isExecutableFile(atPath: binary.path) else {
			showError("Bundled server not found. Rebuild or reinstall \(appName).app.")
			return
		}

		let process = Process()
		process.executableURL = binary

		var environment = ProcessInfo.processInfo.environment
		environment["STARTER_NO_OPEN"] = "1"
		process.environment = environment

		let outputPipe = Pipe()
		process.standardOutput = outputPipe
		process.standardError = Pipe()
		process.terminationHandler = { [weak self] process in
			DispatchQueue.main.async {
				if self?.window == nil {
					self?.showError("\(appName) server exited with status \(process.terminationStatus).")
				}
			}
		}
		server = process

		var outputBuffer = ""
		outputPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
			let data = handle.availableData
			guard !data.isEmpty, let output = String(data: data, encoding: .utf8) else { return }
			outputBuffer += output
			while let newline = outputBuffer.firstIndex(of: "\n") {
				let line = String(outputBuffer[..<newline])
				outputBuffer.removeSubrange(...newline)
				guard let url = self?.serverURL(from: line) else { continue }
				DispatchQueue.main.async {
					self?.openWindow(url: url)
				}
			}
		}

		do {
			try process.run()
		} catch {
			showError("Could not start \(appName) server: \(error.localizedDescription)")
		}
	}

	func serverURL(from line: String) -> URL? {
		let marker = " running at "
		guard let range = line.range(of: marker) else { return nil }
		return URL(string: String(line[range.upperBound...]))
	}

	func openWindow(url: URL) {
		if window != nil { return }

		localAppURL = url

		let configuration = WKWebViewConfiguration()
		configuration.userContentController.addUserScript(urlChangeScript())
		configuration.userContentController.add(self, name: "urlChanged")
		let webView = WKWebView(frame: .zero, configuration: configuration)
		webView.navigationDelegate = self
		webView.uiDelegate = self
		let window = NSWindow(
			contentRect: NSRect(x: 0, y: 0, width: 1000, height: 700),
			styleMask: [.titled, .closable, .miniaturizable, .resizable],
			backing: .buffered,
			defer: false
		)

		window.center()
		window.title = appName
		window.contentView = webView
		window.makeKeyAndOrderFront(nil)

		self.window = window
		self.webView = webView
		restoreOmniRouteAuthCookie(in: webView) {
			webView.load(URLRequest(url: url))
		}
	}

	func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
		guard let url = webView.url else { return }
		handleLoadedURL(url, in: webView)
	}

	func webView(
		_ webView: WKWebView,
		decidePolicyFor navigationAction: WKNavigationAction,
		decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
	) {
		if let url = navigationAction.request.url, isOmniRouteURL(url), returnAfterOmniRouteLoginURL == nil {
			returnAfterOmniRouteLoginURL = webView.url ?? localAppURL
			omniRouteLoginActive = true
		}
		decisionHandler(.allow)
	}

	func webView(
		_ webView: WKWebView,
		createWebViewWith configuration: WKWebViewConfiguration,
		for navigationAction: WKNavigationAction,
		windowFeatures: WKWindowFeatures
	) -> WKWebView? {
		if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
			webView.load(URLRequest(url: url))
		}
		return nil
	}

	func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
		guard message.name == "urlChanged", let href = message.body as? String, let url = URL(string: href), let webView else { return }
		handleLoadedURL(url, in: webView)
	}

	func handleLoadedURL(_ url: URL, in webView: WKWebView) {
		if isLocalAppURL(url) {
			omniRouteLoginActive = false
			returnAfterOmniRouteLoginURL = nil
			return
		}
		if isOmniRouteURL(url) {
			omniRouteLoginActive = true
		}
		guard omniRouteLoginActive, isOmniRouteLoggedInURL(url) else { return }
		let returnURL = returnAfterOmniRouteLoginURL ?? localAppURL
		omniRouteLoginActive = false
		returnAfterOmniRouteLoginURL = nil
		guard let returnURL else { return }
		copyOmniRouteCookiesToLocalAppPath(in: webView) {
			webView.load(URLRequest(url: returnURL))
		}
	}

	func copyOmniRouteCookiesToLocalAppPath(in webView: WKWebView, completion: @escaping () -> Void) {
		let cookieStore = webView.configuration.websiteDataStore.httpCookieStore
		cookieStore.getAllCookies { [self] cookies in
			let omniRouteCookies = cookies.filter { cookie in
				cookie.domain == "localhost" || cookie.domain == ".localhost"
			}
			let authCookie = omniRouteCookies.first { $0.name == omniRouteAuthCookieName }
			if let authCookie {
				self.saveOmniRouteAuthCookie(authCookie.value)
			}
			if omniRouteCookies.isEmpty {
				DispatchQueue.main.async(execute: completion)
				return
			}

			let group = DispatchGroup()
			for cookie in omniRouteCookies {
				guard let copiedCookie = self.localhostCookie(name: cookie.name, value: cookie.value) else { continue }
				group.enter()
				cookieStore.setCookie(copiedCookie) {
					group.leave()
				}
			}
			group.notify(queue: .main, execute: completion)
		}
	}

	func restoreOmniRouteAuthCookie(in webView: WKWebView, completion: @escaping () -> Void) {
		guard let value = savedOmniRouteAuthCookie(), let cookie = localhostCookie(name: omniRouteAuthCookieName, value: value) else {
			completion()
			return
		}
		webView.configuration.websiteDataStore.httpCookieStore.setCookie(cookie, completionHandler: completion)
	}

	func localhostCookie(name: String, value: String) -> HTTPCookie? {
		HTTPCookie(properties: [
			.name: name,
			.value: value,
			.domain: "localhost",
			.path: "/",
		])
	}

	func saveOmniRouteAuthCookie(_ value: String) {
		guard let data = value.data(using: .utf8) else { return }
		let query: [String: Any] = [
			kSecClass as String: kSecClassGenericPassword,
			kSecAttrService as String: keychainService,
			kSecAttrAccount as String: omniRouteAuthCookieName,
		]
		let attributes: [String: Any] = [kSecValueData as String: data]
		let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
		if status == errSecItemNotFound {
			var addQuery = query
			addQuery[kSecValueData as String] = data
			SecItemAdd(addQuery as CFDictionary, nil)
		}
	}

	func savedOmniRouteAuthCookie() -> String? {
		let query: [String: Any] = [
			kSecClass as String: kSecClassGenericPassword,
			kSecAttrService as String: keychainService,
			kSecAttrAccount as String: omniRouteAuthCookieName,
			kSecReturnData as String: true,
			kSecMatchLimit as String: kSecMatchLimitOne,
		]
		var result: AnyObject?
		guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
		return String(data: data, encoding: .utf8)
	}

	func urlChangeScript() -> WKUserScript {
		let source = """
		(() => {
			const notify = () => window.webkit.messageHandlers.urlChanged.postMessage(location.href);
			const pushState = history.pushState;
			const replaceState = history.replaceState;
			history.pushState = function(...args) {
				const result = pushState.apply(this, args);
				notify();
				return result;
			};
			history.replaceState = function(...args) {
				const result = replaceState.apply(this, args);
				notify();
				return result;
			};
			window.addEventListener("popstate", notify);
			window.addEventListener("hashchange", notify);
			notify();
		})();
		"""
		return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
	}

	func isLocalAppURL(_ url: URL) -> Bool {
		guard let localAppURL else { return false }
		return url.host == localAppURL.host && url.port == localAppURL.port
	}

	func isOmniRouteURL(_ url: URL) -> Bool {
		url.host == "localhost" && url.port == 20128
	}

	func isOmniRouteLoggedInURL(_ url: URL) -> Bool {
		guard isOmniRouteURL(url) else { return false }
		let path = url.path.lowercased()
		if path.contains("login") || path.contains("signin") || path.contains("auth") || path.contains("oauth") || path.contains("callback") {
			return false
		}
		return path == "/dashboard" || path.hasPrefix("/dashboard/")
	}

	func showError(_ message: String) {
		let alert = NSAlert()
		alert.messageText = "\(appName) failed to start"
		alert.informativeText = message
		alert.runModal()
		NSApp.terminate(nil)
	}
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)
app.run()
