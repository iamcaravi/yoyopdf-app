export function isNativePlatform() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.());
}
