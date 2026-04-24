import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Small fixed badge that appears whenever the browser reports it is offline.
 * Pairs with the toast fired from `src/pwa.ts` when the SW finishes precaching
 * the dictionary, so the user knows when the app is safe to use without
 * connectivity and gets clear feedback while disconnected.
 */
const OfflineIndicator = () => {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
      </span>
      <WifiOff className="h-4 w-4 text-destructive" aria-hidden />
      <span>Радиш без интернета — речник је доступан локално</span>
    </div>
  );
};

export default OfflineIndicator;
