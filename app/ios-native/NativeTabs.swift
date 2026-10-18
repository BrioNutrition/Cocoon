
import LocalAuthentication

// ===== Cocoon : éléments natifs d'iOS (Liquid Glass avec le SDK iOS 26) =====
// Barre d'onglets, barre du haut (retour, titre, boutons en verre), menus, vibrations, thème.
// Ajouté à AppDelegate.swift par ios-native/patch.sh après « npx cap add ios ».
// jaune Cocoon ; un peu plus soutenu en thème clair pour rester lisible
let cocoonYellow = UIColor { t in t.userInterfaceStyle == .dark ? UIColor(red: 1.0, green: 0.788, blue: 0.29, alpha: 1) : UIColor(red: 0.90, green: 0.62, blue: 0.0, alpha: 1) }

// réglage « Face ID à la connexion » (choix de l'utilisateur, mémorisé sur le téléphone)
enum CocoonLockKeys { static let enabled = "cocoon.faceid"; static let asked = "cocoon.faceidAsked" }

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
        CAPPluginMethod(name: "theme", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sheet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alert", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "faceid", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "faceidCheck", returnType: CAPPluginReturnPromise)
    ]
    private var bar: UITabBar?
    private var top: UIView?
    private var topScroll: NSKeyValueObservation?
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
            let appearing = bar.superview == nil || bar.isHidden
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
            // arrivée en douceur (fondu + légère montée), comme le reste de la page
            if appearing {
                bar.alpha = 0; bar.transform = CGAffineTransform(translationX: 0, y: 24)
                UIView.animate(withDuration: 0.5, delay: 0.05, usingSpringWithDamping: 0.9, initialSpringVelocity: 0, options: [.allowUserInteraction]) {
                    bar.alpha = 1; bar.transform = .identity
                }
            }
            call.resolve()
        }
    }
    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let bar = self.bar, !bar.isHidden else { call.resolve(); return }
            UIView.animate(withDuration: 0.25, animations: { bar.alpha = 0 }) { done in if done && bar.alpha < 0.01 { bar.isHidden = true; bar.alpha = 1 } }
            call.resolve()
        }
    }
    // une fenêtre est ouverte (feuille, panneau…) : la page derrière ne défile plus ; la barre d'onglets reste
    @objc func sheet(_ call: CAPPluginCall) {
        let open = call.getBool("open") ?? false
        DispatchQueue.main.async {
            // la page derrière ne défile plus pendant qu'une fenêtre est ouverte (sinon le geste de fermeture la fait bouger)
            self.bridge?.webView?.scrollView.isScrollEnabled = !open
            call.resolve()
        }
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
            if id != "back" { UIImpactFeedbackGenerator(style: .light).impactOccurred() }   // pas de vibration pour revenir en arrière
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
        let dim = call.getBool("dim") ?? false, offset = CGFloat(call.getDouble("top") ?? 6), tcol = color(call.getString("color"))
        DispatchQueue.main.async {
            self.top?.removeFromSuperview(); self.top = nil; self.topScroll = nil
            guard visible, #available(iOS 15.0, *), let view = self.bridge?.viewController?.view else { call.resolve(); return }
            let zoom = self.bridge?.webView?.pageZoom ?? 1   // la page est zoomée (taille du texte) : px de la page → points
            // la barre défile avec la page, coupée sous la barre de l'heure ; les touches passent à la page autour
            let clip = PassThroughView(); clip.clipsToBounds = true; clip.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(clip)
            NSLayoutConstraint.activate([
                clip.leadingAnchor.constraint(equalTo: view.leadingAnchor), clip.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                clip.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), clip.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
            let v = PassThroughView(); v.translatesAutoresizingMaskIntoConstraints = false
            clip.addSubview(v)
            NSLayoutConstraint.activate([
                v.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
                v.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
                v.topAnchor.constraint(equalTo: clip.topAnchor, constant: offset * zoom),
                v.heightAnchor.constraint(equalToConstant: 44)
            ])
            if let sv = self.bridge?.webView?.scrollView {
                self.topScroll = sv.observe(\.contentOffset, options: [.initial, .new]) { [weak v] sv, _ in
                    v?.transform = CGAffineTransform(translationX: 0, y: -(sv.contentOffset.y + sv.adjustedContentInset.top))
                }
            }
            let lbl = UILabel(); lbl.text = title; lbl.font = UIFontMetrics(forTextStyle: .title2).scaledFont(for: .systemFont(ofSize: 21, weight: .bold), maximumPointSize: 30); lbl.adjustsFontForContentSizeCategory = true; lbl.textColor = tcol ?? .label
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
            self.top = clip
            // une fenêtre est ouverte par-dessus la page : la barre reste à sa place, atténuée et inactive (comme sous une feuille iOS)
            if dim { clip.alpha = 0.3; clip.isUserInteractionEnabled = false }
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

    // ---------- alerte iOS (confirmation : Annuler + bouton rouge, champ de texte en option) ----------
    @objc func alert(_ call: CAPPluginCall) {
        let actions = (call.options["actions"] as? [[String: Any]]) ?? []
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else { call.resolve(["id": NSNull()]); return }
            let ac = UIAlertController(title: call.getString("title"), message: call.getString("message"), preferredStyle: .alert)
            if let ph = call.getString("field") { ac.addTextField { tf in tf.placeholder = ph; tf.autocapitalizationType = .allCharacters; tf.autocorrectionType = .no } }
            for a in actions {
                let st: UIAlertAction.Style = (a["style"] as? String) == "cancel" ? .cancel : (a["style"] as? String) == "destructive" ? .destructive : .default
                let id = a["id"] as? String ?? ""
                ac.addAction(UIAlertAction(title: a["title"] as? String ?? "", style: st) { _ in
                    call.resolve(["id": id, "text": ac.textFields?.first?.text ?? ""])
                })
            }
            vc.present(ac, animated: true)
        }
    }

    // ---------- Face ID à la connexion : vérification ponctuelle (code de l'iPhone en secours) ----------
    @objc func faceidCheck(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let ctx = LAContext(); ctx.localizedCancelTitle = "Annuler"
            ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: call.getString("reason") ?? "Confirme que c'est bien toi") { ok, _ in call.resolve(["ok": ok]) }
        }
    }
    // ---------- Face ID à la connexion : au choix de l'utilisateur ({enabled?, asked?} → état) ----------
    @objc func faceid(_ call: CAPPluginCall) {
        let d = UserDefaults.standard
        if let e = call.getBool("enabled") { d.set(e, forKey: CocoonLockKeys.enabled) }
        if let a = call.getBool("asked") { d.set(a, forKey: CocoonLockKeys.asked) }
        let ctx = LAContext(), bio = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        let any = LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
        let label = bio && ctx.biometryType == .faceID ? "Face ID" : bio && ctx.biometryType == .touchID ? "Touch ID" : "Code de l'iPhone"
        call.resolve(["enabled": d.bool(forKey: CocoonLockKeys.enabled), "asked": d.bool(forKey: CocoonLockKeys.asked), "available": any, "label": label])
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
        let dark = call.getBool("dark") ?? false, bg = color(call.getString("bg"))
        DispatchQueue.main.async {
            self.bridge?.viewController?.overrideUserInterfaceStyle = dark ? .dark : .light
            // fond visible quand on tire la page au-delà du haut ou du bas : celui de la page (sinon il restait sombre en thème clair)
            if bg != nil { UserDefaults.standard.set(call.getString("bg"), forKey: "cocoon.bg") }   // reprise dès le prochain lancement
            if let c = bg, let wv = self.bridge?.webView {
                wv.backgroundColor = c; wv.scrollView.backgroundColor = c; self.bridge?.viewController?.view.backgroundColor = c
                if #available(iOS 15.0, *) { wv.underPageBackgroundColor = c }
            }
            call.resolve()
        }
    }
}

// vue qui laisse passer les touches à ce qui est dessous, sauf sur ses boutons
class PassThroughView: UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        let h = super.hitTest(point, with: event)
        return h === self ? nil : h
    }
}

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeTabsPlugin())
        // pas de barre de défilement à droite (comme une app native)
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        // la page rebondit en haut et en bas même quand elle est plus courte que l'écran
        webView?.scrollView.bounces = true   // Capacitor le coupe par défaut
        webView?.scrollView.alwaysBounceVertical = true
        // dès le lancement, le fond du dernier thème utilisé (sinon sombre puis blanc d'un coup en thème clair)
        if let css = UserDefaults.standard.string(forKey: "cocoon.bg") {
            let n = css.components(separatedBy: CharacterSet(charactersIn: "0123456789.").inverted).compactMap { Double($0) }
            if n.count >= 3 { let c = UIColor(red: n[0] / 255, green: n[1] / 255, blue: n[2] / 255, alpha: 1)
                webView?.backgroundColor = c; webView?.scrollView.backgroundColor = c; view.backgroundColor = c
                if #available(iOS 15.0, *) { webView?.underPageBackgroundColor = c } }
        }
        // taille du texte choisie dans Réglages › Affichage : toute la page suit (comme un zoom)
        applyTextSize()
        NotificationCenter.default.addObserver(self, selector: #selector(applyTextSize), name: UIContentSizeCategory.didChangeNotification, object: nil)
    }
    @objc func applyTextSize() {
        let z: [UIContentSizeCategory: CGFloat] = [
            .extraSmall: 0.85, .small: 0.9, .medium: 0.95, .large: 1.0, .extraLarge: 1.08, .extraExtraLarge: 1.16, .extraExtraExtraLarge: 1.24,
            .accessibilityMedium: 1.32, .accessibilityLarge: 1.4, .accessibilityExtraLarge: 1.48, .accessibilityExtraExtraLarge: 1.56, .accessibilityExtraExtraExtraLarge: 1.64
        ]
        if #available(iOS 14.0, *) { webView?.pageZoom = z[traitCollection.preferredContentSizeCategory] ?? 1.0 }
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
