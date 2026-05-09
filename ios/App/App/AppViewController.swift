import Capacitor
import WebKit

class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        if #available(iOS 16.4, *) {
            webView?.isInspectable = true
        }
    }
}