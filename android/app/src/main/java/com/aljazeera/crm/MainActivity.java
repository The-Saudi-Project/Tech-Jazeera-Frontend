package com.aljazeera.crm;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Android's WebView CookieManager defaults acceptThirdPartyCookies to
    // false, which treats the API's Set-Cookie response (a different origin
    // than the WebView's own https://localhost) as third-party and silently
    // drops it — breaking the httpOnly refresh-token cookie the whole
    // stay-logged-in flow depends on. Needed alongside capacitor.config.json's
    // CapacitorHttp.enabled:true (see that file's comment) — confirmed by
    // direct testing that plain WebView networking alone does not reliably
    // deliver a cross-origin Set-Cookie into this CookieManager on this
    // Android/WebView combination; CapacitorHttp's native request path with
    // its CapacitorCookies companion plugin does.
    CookieManager cookieManager = CookieManager.getInstance();
    cookieManager.setAcceptCookie(true);
    cookieManager.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);

    boolean isDebugBuild = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    if (isDebugBuild) {
      // Dev-only: the WebView's own origin is HTTPS (server.androidScheme in
      // capacitor.config.json) but the local dev backend is plain HTTP (no
      // cert set up for local dev) — Chromium's Mixed Content policy blocks
      // an HTTPS page calling an HTTP API by default, independent of the
      // cleartext network security config (that one only controls whether
      // plaintext is allowed at all, not whether an HTTPS page may call it).
      // A release build always points at a real HTTPS backend, so this
      // never applies there.
      this.bridge.getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
  }

  @Override
  public void onPause() {
    super.onPause();
    // Defense in depth: force any pending cookie writes to disk on every
    // realistic path the app stops being foreground (home button, task
    // switch, another app opening) before Android can kill the process.
    // (A raw `am force-stop` bypasses this — and every other lifecycle
    // callback — by OS design; verified separately that cookies still
    // persist across that too, since CapacitorHttp's native path writes
    // through promptly on its own — this is just an extra safety net.)
    CookieManager.getInstance().flush();
  }
}
