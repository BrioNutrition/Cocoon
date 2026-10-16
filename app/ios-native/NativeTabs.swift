
// ===== Cocoon : barre d'onglets native d'iOS (Liquid Glass avec le SDK iOS 26) =====
// Ajouté à AppDelegate.swift par ios-native/patch.sh après « npx cap add ios ».
@objc(NativeTabsPlugin)
public class NativeTabsPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "NativeTabsPlugin"
    public let jsName = "NativeTabs"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "select", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "badge", returnType: CAPPluginReturnPromise)
    ]
    private var bar: UITabBar?

    @objc func show(_ call: CAPPluginCall) {
        let items = (call.options["items"] as? [[String: Any]]) ?? []
        DispatchQueue.main.async {
            guard let view = self.bridge?.viewController?.view else { call.reject("pas de vue"); return }
            let bar = self.bar ?? UITabBar()
            bar.delegate = self
            bar.items = items.enumerated().map { (i, it) in
                UITabBarItem(title: it["title"] as? String ?? "", image: UIImage(systemName: it["icon"] as? String ?? "circle"), tag: i)
            }
            if bar.selectedItem == nil { bar.selectedItem = bar.items?.first }
            if bar.superview == nil {
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
            if let items = self.bar?.items, i >= 0, i < items.count { items[i].badgeValue = v; items[i].badgeColor = UIColor(red: 1, green: 0.79, blue: 0.29, alpha: 1) }
            call.resolve()
        }
    }
    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        notifyListeners("select", data: ["index": item.tag])
    }
}

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeTabsPlugin())
    }
}
