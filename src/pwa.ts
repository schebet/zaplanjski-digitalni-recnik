import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

const UPDATE_FLAG = "pwa:updating";
const CACHE_WHITELIST = ["downloads", "images"];

async function clearStaleCaches() {
  if (!("caches" in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => !CACHE_WHITELIST.includes(name))
      .map((name) => caches.delete(name)),
  );
}

/**
 * Register the service worker, but only when it is safe to do so.
 *
 * The Lovable editor renders the app inside an iframe on a preview host.
 * Service workers in that context cause stale content and navigation
 * interference, so we skip registration (and proactively unregister any
 * leftover SW) whenever we detect a preview / iframe environment.
 */
export function setupPWA() {
  if (typeof window === "undefined") return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  let isReloadingForUpdate = false;

  const forceRefreshToLatest = async () => {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    sessionStorage.setItem(UPDATE_FLAG, "1");
    await clearStaleCaches();
    window.location.reload();
  };

  if (sessionStorage.getItem(UPDATE_FLAG) === "1") {
    sessionStorage.removeItem(UPDATE_FLAG);
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void forceRefreshToLatest();
  });

  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent("pwa:offline-ready"));
      toast.success("Спремно за рад без интернета", {
        description:
          "Речник и апликација су сачувани локално. Можеш их користити и без везе.",
        duration: 6000,
      });
    },
    onNeedRefresh() {
      toast("Преузимам најновију верзију речника", {
        description: "Нови CSS и asset-и ће се учитати аутоматски.",
        duration: 4000,
      });
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return;

      const checkForUpdates = () => reg.update().catch(() => {});

      void checkForUpdates();
      window.addEventListener("focus", checkForUpdates);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void checkForUpdates();
        }
      });
      setInterval(checkForUpdates, 5 * 60 * 1000);
    },
    onRegisterError(err) {
      console.warn("[PWA] SW registration failed:", err);
    },
  });
}
