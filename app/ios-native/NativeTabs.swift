
// ===== Cocoon : éléments natifs d'iOS (Liquid Glass avec le SDK iOS 26) =====
// Barre d'onglets, barre du haut (retour, titre, boutons en verre), menus, vibrations, thème.
// Ajouté à AppDelegate.swift par ios-native/patch.sh après « npx cap add ios ».
// jaune Cocoon ; un peu plus soutenu en thème clair pour rester lisible
let cocoonYellow = UIColor { t in t.userInterfaceStyle == .dark ? UIColor(red: 1.0, green: 0.788, blue: 0.29, alpha: 1) : UIColor(red: 0.90, green: 0.62, blue: 0.0, alpha: 1) }

@objc(NativeTabsPlugin)
public class NativeTabsPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "NativeTabsPlugin"
    public let jsName = "NativeTabs"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "select", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "badge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "topbar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "menu", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "theme", returnType: CAPPluginReturnPromise)
    ]
    private var bar: UITabBar?
    private var top: UIView?
    // raccourci de l'icône reçu avant que la page soit prête (lancement à froid)
    static var pendingShortcut: String?
    override public func load() {
        NotificationCenter.default.addObserver(forName: Notification.Name("CocoonShortcut"), object: nil, queue: .main) { [weak self] n in
            if let t = n.object as? String { self?.notifyListeners("shortcut", data: ["type": t], retainUntilConsumed: true); NativeTabsPlugin.pendingShortcut = nil }
        }
        if let t = NativeTabsPlugin.pendingShortcut { notifyListeners("shortcut", data: ["type": t], retainUntilConsumed: true); NativeTabsPlugin.pendingShortcut = nil }
    }
    // appui long sur un onglet → la page affiche les raccourcis (pour l'onglet Cocoony)
    @objc func holdTab(_ g: UILongPressGestureRecognizer) {
        guard g.state == .began, let bar = self.bar, let n = bar.items?.count, n > 0 else { return }
        let x = g.location(in: bar).x, i = max(0, min(n - 1, Int(x / (bar.bounds.width / CGFloat(n)))))
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        notifyListeners("hold", data: ["index": i])
    }

    // ---------- barre d'onglets ----------
    private func image(fromDataURL s: String?) -> UIImage? {
        guard let s = s, let comma = s.firstIndex(of: ","), let d = Data(base64Encoded: String(s[s.index(after: comma)...])), let img = UIImage(data: d) else { return nil }
        let size = CGSize(width: 28, height: 28)
        return UIGraphicsImageRenderer(size: size).image { _ in
            UIBezierPath(ovalIn: CGRect(origin: .zero, size: size)).addClip()
            img.draw(in: CGRect(origin: .zero, size: size))
        }.withRenderingMode(.alwaysOriginal)
    }
    @objc func show(_ call: CAPPluginCall) {
        let items = (call.options["items"] as? [[String: Any]]) ?? []
        DispatchQueue.main.async {
            guard let view = self.bridge?.viewController?.view else { call.reject("pas de vue"); return }
            let bar = self.bar ?? UITabBar()
            bar.delegate = self
            bar.tintColor = cocoonYellow
            let old = bar.selectedItem?.tag ?? 0
            bar.items = items.enumerated().map { (i, it) in
                let img = self.image(fromDataURL: it["image"] as? String) ?? UIImage(systemName: it["icon"] as? String ?? "circle")
                return UITabBarItem(title: it["title"] as? String ?? "", image: img, tag: i)
            }
            if let items = bar.items, old < items.count { bar.selectedItem = items[old] }
            if bar.superview == nil {
                let lp = UILongPressGestureRecognizer(target: self, action: #selector(self.holdTab(_:)))
                lp.minimumPressDuration = 0.45; lp.cancelsTouchesInView = true
                bar.addGestureRecognizer(lp)
                bar.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(bar)
                NSLayoutConstraint.activate([
                    bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                    bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                    bar.bottomAnchor.constraint(equalTo: view.bottomAnchor)
                ])
            }
            bar.isHidden = false
            self.bar = bar
            call.resolve()
        }
    }
    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.bar?.isHidden = true; call.resolve() }
    }
    @objc func select(_ call: CAPPluginCall) {
        let i = call.getInt("index") ?? 0
        DispatchQueue.main.async {
            if let items = self.bar?.items, i >= 0, i < items.count { self.bar?.selectedItem = items[i] }
            call.resolve()
        }
    }
    @objc func badge(_ call: CAPPluginCall) {
        let i = call.getInt("index") ?? 0, v = call.getString("value")
        DispatchQueue.main.async {
            if let items = self.bar?.items, i >= 0, i < items.count { items[i].badgeValue = v; items[i].badgeColor = cocoonYellow }
            call.resolve()
        }
    }
    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        UISelectionFeedbackGenerator().selectionChanged()
        notifyListeners("select", data: ["index": item.tag])
    }

    // ---------- barre du haut : retour, titre, boutons en verre ----------
    private func color(_ css: String?) -> UIColor? {
        guard let css = css else { return nil }
        let n = css.components(separatedBy: CharacterSet(charactersIn: "0123456789.").inverted).filter { !$0.isEmpty }.compactMap { Double($0) }
        guard n.count >= 3 else { return nil }
        return UIColor(red: n[0] / 255, green: n[1] / 255, blue: n[2] / 255, alpha: 1)
    }
    @available(iOS 15.0, *)
    private func glassButton(_ symbol: String, id: String, prominent: Bool) -> UIButton {
        var cfg: UIButton.Configuration
        if #available(iOS 26.0, *) { cfg = prominent ? .prominentGlass() : .glass() } else { cfg = prominent ? .filled() : .gray() }
        cfg.image = UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 17, weight: .semibold))
        cfg.cornerStyle = .capsule
        if prominent { cfg.baseBackgroundColor = cocoonYellow; cfg.baseForegroundColor = .black }
        let b = UIButton(configuration: cfg, primaryAction: UIAction { [weak self] _ in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            self?.notifyListeners("topbar", data: ["id": id])
        })
        if prominent { b.tintColor = cocoonYellow }
        b.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([b.widthAnchor.constraint(equalToConstant: 44), b.heightAnchor.constraint(equalToConstant: 44)])
        return b
    }
    @objc func topbar(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let title = call.getString("title") ?? "", back = call.getBool("back") ?? false
        let actions = (call.options["actions"] as? [[String: Any]]) ?? []
        let offset = CGFloat(call.getDouble("top") ?? 6), tcol = color(call.getString("color"))
        DispatchQueue.main.async {
            self.top?.removeFromSuperview(); self.top = nil
            guard visible, #available(iOS 15.0, *), let view = self.bridge?.viewController?.view else { call.resolve(); return }
            let v = UIView(); v.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(v)
            NSLayoutConstraint.activate([
                v.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
                v.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
                v.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: offset),
                v.heightAnchor.constraint(equalToConstant: 44)
            ])
            let lbl = UILabel(); lbl.text = title; lbl.font = .systemFont(ofSize: 17, weight: .bold); lbl.textColor = tcol ?? .label
            lbl.translatesAutoresizingMaskIntoConstraints = false
            v.addSubview(lbl)
            NSLayoutConstraint.activate([lbl.centerXAnchor.constraint(equalTo: v.centerXAnchor), lbl.centerYAnchor.constraint(equalTo: v.centerYAnchor)])
            if back {
                let b = self.glassButton("chevron.left", id: "back", prominent: false)
                v.addSubview(b)
                NSLayoutConstraint.activate([b.leadingAnchor.constraint(equalTo: v.leadingAnchor), b.centerYAnchor.constraint(equalTo: v.centerYAnchor)])
            }
            var last: UIView? = nil
            for a in actions.reversed() {
                let b = self.glassButton(a["icon"] as? String ?? "circle", id: a["id"] as? String ?? "", prominent: (a["prominent"] as? Bool) ?? false)
                v.addSubview(b)
                b.centerYAnchor.constraint(equalTo: v.centerYAnchor).isActive = true
                if let l = last { b.trailingAnchor.constraint(equalTo: l.leadingAnchor, constant: -10).isActive = true }
                else { b.trailingAnchor.constraint(equalTo: v.trailingAnchor).isActive = true }
                last = b
            }
            self.top = v
            call.resolve()
        }
    }

    // ---------- menus natifs (feuille d'actions) ----------
    @objc func menu(_ call: CAPPluginCall) {
        let items = (call.options["items"] as? [[String: Any]]) ?? []
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else { call.resolve(["id": NSNull()]); return }
            let ac = UIAlertController(title: call.getString("title"), message: nil, preferredStyle: .actionSheet)
            for it in items {
                let id = it["id"] as? String ?? ""
                let a = UIAlertAction(title: it["title"] as? String ?? "", style: ((it["destructive"] as? Bool) ?? false) ? .destructive : .default) { _ in call.resolve(["id": id]) }
                if let s = it["icon"] as? String, let img = UIImage(systemName: s) { a.setValue(img, forKey: "image") }
                ac.addAction(a)
            }
            ac.addAction(UIAlertAction(title: "Annuler", style: .cancel) { _ in call.resolve(["id": NSNull()]) })
            ac.view.tintColor = .label
            if let pop = ac.popoverPresentationController {
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.maxY - 90, width: 1, height: 1)
            }
            vc.present(ac, animated: true)
        }
    }

    // ---------- vibrations ----------
    @objc func haptic(_ call: CAPPluginCall) {
        let s = call.getString("style") ?? "light"
        DispatchQueue.main.async {
            let st: UIImpactFeedbackGenerator.FeedbackStyle = s == "medium" ? .medium : s == "rigid" ? .rigid : s == "soft" ? .soft : .light
            UIImpactFeedbackGenerator(style: st).impactOccurred()
            call.resolve()
        }
    }

    // ---------- thème clair / sombre de l'app ----------
    @objc func theme(_ call: CAPPluginCall) {
        let dark = call.getBool("dark") ?? false
        DispatchQueue.main.async {
            self.bridge?.viewController?.overrideUserInterfaceStyle = dark ? .dark : .light
            call.resolve()
        }
    }
}

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeTabsPlugin())
        // pas de barre de défilement à droite (comme une app native)
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
    }
}

// appui long sur l'icône de l'app (raccourcis déclarés dans Info.plist par patch.sh)
extension AppDelegate {
    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        NativeTabsPlugin.pendingShortcut = shortcutItem.type
        NotificationCenter.default.post(name: Notification.Name("CocoonShortcut"), object: shortcutItem.type)
        completionHandler(true)
    }
}
