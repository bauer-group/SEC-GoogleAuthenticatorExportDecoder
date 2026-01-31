/**
 * PWA detection utilities for Progressive Web App mode and platform detection
 *
 * This module provides browser-compatible functions to detect:
 * - PWA standalone mode (installed to homescreen)
 * - iOS/Safari platform (for camera access workarounds)
 * - Secure context (HTTPS requirement for camera)
 *
 * These detections are critical for camera-based QR scanning because:
 * - iOS PWA mode has known camera access issues
 * - Camera API requires HTTPS or localhost
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Extended Navigator interface for iOS-specific properties
 * iOS Safari exposes `standalone` property when running as homescreen app
 */
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/**
 * PWA environment information
 */
export interface PWAEnvironment {
  /** Whether running in PWA standalone mode */
  isPWA: boolean;
  /** Whether running on iOS device */
  isIOS: boolean;
  /** Whether running in Safari browser */
  isSafari: boolean;
  /** Whether running in a secure context (HTTPS/localhost) */
  isSecureContext: boolean;
  /** Whether camera access is likely to work */
  isCameraLikelySupported: boolean;
}

// =============================================================================
// PWA Detection Functions
// =============================================================================

/**
 * Detect if the app is running in PWA standalone mode
 *
 * Standalone mode is when the app has been "installed" to the device's
 * homescreen and runs without browser chrome (address bar, etc.)
 *
 * Detection methods:
 * 1. CSS media query `display-mode: standalone`
 * 2. iOS Safari's `navigator.standalone` property
 * 3. Android TWA (Trusted Web Activity) via referrer
 *
 * @returns true if running in PWA standalone mode
 */
export function isPWAStandalone(): boolean {
  // Method 1: Standard W3C display-mode media query
  // Works on Chrome, Firefox, Edge, and modern browsers
  const matchesStandaloneMedia = window.matchMedia(
    '(display-mode: standalone)'
  ).matches;

  // Method 2: iOS Safari specific property
  // Safari doesn't support display-mode media query in standalone
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  const iosStandalone = navigatorWithStandalone.standalone === true;

  // Method 3: Android TWA detection via document referrer
  // When launched from a TWA, the referrer includes android-app://
  const isTWA = document.referrer.includes('android-app://');

  return matchesStandaloneMedia || iosStandalone || isTWA;
}

/**
 * Detect if the app is running on an iOS device
 *
 * IMPORTANT: iOS PWAs have known camera access issues when installed
 * to the homescreen. Users should be guided to use file upload instead.
 *
 * Detection uses User Agent string which can be spoofed, but this is
 * acceptable for UI guidance purposes (not security decisions).
 *
 * @returns true if running on iOS (iPhone, iPad, or iPod)
 */
export function isIOSDevice(): boolean {
  // Check user agent for iOS device identifiers
  // Note: iPadOS 13+ reports as "Macintosh" but supports touch
  const userAgent = navigator.userAgent;
  const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);

  // Additional check for iPadOS 13+ which reports as Mac
  // iPadOS has touch support while macOS does not
  const isIPadOS =
    /Macintosh/.test(userAgent) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 0;

  return isIOSUserAgent || isIPadOS;
}

/**
 * Detect if the app is running in Safari browser
 *
 * Safari has specific behaviors:
 * - Doesn't remember camera permissions reliably
 * - Different getUserMedia implementation
 *
 * @returns true if running in Safari (includes iOS Safari)
 */
export function isSafariBrowser(): boolean {
  const userAgent = navigator.userAgent;

  // Safari includes "Safari" but so does Chrome on iOS
  // Chrome includes "Chrome" or "CriOS" in user agent
  // Edge includes "Edg" in user agent
  const hasSafari = /Safari/.test(userAgent);
  const hasChrome = /Chrome|CriOS/.test(userAgent);
  const hasEdge = /Edg/.test(userAgent);
  const hasFirefox = /Firefox|FxiOS/.test(userAgent);

  // Safari if it has Safari but none of the other browser identifiers
  return hasSafari && !hasChrome && !hasEdge && !hasFirefox;
}

/**
 * Check if the app is running in a secure context
 *
 * Camera access (getUserMedia) requires a secure context:
 * - HTTPS connection
 * - localhost (including 127.0.0.1)
 * - file:// protocol (limited)
 *
 * @returns true if in a secure context where camera API is available
 */
export function isSecureContext(): boolean {
  // Modern browsers expose this property directly
  if (typeof window.isSecureContext === 'boolean') {
    return window.isSecureContext;
  }

  // Fallback for older browsers: check protocol
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // HTTPS is always secure
  if (protocol === 'https:') {
    return true;
  }

  // HTTP is secure only for localhost
  if (protocol === 'http:') {
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    );
  }

  // file:// protocol is considered secure for some APIs
  if (protocol === 'file:') {
    return true;
  }

  return false;
}

/**
 * Check if camera access is likely to be supported and working
 *
 * This is a heuristic check that identifies known problematic scenarios:
 * - iOS PWA mode (camera broken in homescreen apps)
 * - Non-secure contexts (camera API not available)
 *
 * Note: This does NOT guarantee camera will work, only that known
 * blockers are not present. Permission issues are separate.
 *
 * @returns true if camera access is likely to work
 */
export function isCameraLikelySupported(): boolean {
  // Camera API not available in insecure contexts
  if (!isSecureContext()) {
    return false;
  }

  // Check if MediaDevices API exists
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }

  // iOS PWA standalone mode has broken camera support
  // This is a known issue with no workaround
  if (isIOSDevice() && isPWAStandalone()) {
    return false;
  }

  return true;
}

// =============================================================================
// Combined Environment Detection
// =============================================================================

/**
 * Get complete PWA environment information
 *
 * Returns a snapshot of all relevant environment flags for UI decisions.
 * Use this to determine which scanning options to show prominently.
 *
 * @returns PWAEnvironment object with all detection flags
 *
 * @example
 * ```typescript
 * const env = getPWAEnvironment();
 * if (!env.isCameraLikelySupported) {
 *   // Show file upload prominently
 *   setShowFileUploadFirst(true);
 * }
 * ```
 */
export function getPWAEnvironment(): PWAEnvironment {
  return {
    isPWA: isPWAStandalone(),
    isIOS: isIOSDevice(),
    isSafari: isSafariBrowser(),
    isSecureContext: isSecureContext(),
    isCameraLikelySupported: isCameraLikelySupported(),
  };
}

// =============================================================================
// Visibility Change Detection for PWA
// =============================================================================

/**
 * Register a callback for visibility changes (app returning from background)
 *
 * PWAs may need to reinitialize camera when returning from background.
 * This provides a clean way to handle visibility changes.
 *
 * @param onVisible - Callback when app becomes visible
 * @param onHidden - Callback when app becomes hidden
 * @returns Cleanup function to remove the event listener
 *
 * @example
 * ```typescript
 * const cleanup = onVisibilityChange(
 *   () => reinitializeCamera(),
 *   () => pauseCamera()
 * );
 *
 * // Later, in cleanup:
 * cleanup();
 * ```
 */
export function onVisibilityChange(
  onVisible?: () => void,
  onHidden?: () => void
): () => void {
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      onVisible?.();
    } else {
      onHidden?.();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
