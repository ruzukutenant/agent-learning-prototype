/**
 * Meta Pixel client-side tracking library.
 * All functions no-op gracefully if VITE_META_PIXEL_ID is not set or fbq is blocked.
 */

const w = window as any

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined

/** Call fbq safely — no-ops if pixel not loaded or blocked by ad blocker. */
function fbq(...args: any[]): void {
  if (typeof w.fbq === 'function') {
    w.fbq(...args)
  }
}

/**
 * Load fbevents.js and initialize the Meta Pixel.
 * Safe to call multiple times — subsequent calls are ignored.
 */
export function initMetaPixel(): void {
  if (!PIXEL_ID) return
  if (typeof w.fbq === 'function') return // already loaded

  // Standard Meta Pixel base code
  const n: any = (w.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
  })
  if (!w._fbq) w._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []

  const t = document.createElement('script')
  t.async = true
  t.src = 'https://connect.facebook.net/en_US/fbevents.js'
  const s = document.getElementsByTagName('script')[0]
  s?.parentNode?.insertBefore(t, s)

  w.fbq('init', PIXEL_ID)
}

/**
 * Fire a standard Meta event (e.g. PageView, Lead).
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
): void {
  const options = eventId ? { eventID: eventId } : undefined
  if (params && options) {
    fbq('track', eventName, params, options)
  } else if (params) {
    fbq('track', eventName, params)
  } else if (options) {
    fbq('track', eventName, {}, options)
  } else {
    fbq('track', eventName)
  }
}

/**
 * Fire a custom Meta event (e.g. StartConversation, EngagedUser).
 */
export function trackMetaCustomEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
): void {
  const options = eventId ? { eventID: eventId } : undefined
  if (params && options) {
    fbq('trackCustom', eventName, params, options)
  } else if (params) {
    fbq('trackCustom', eventName, params)
  } else if (options) {
    fbq('trackCustom', eventName, {}, options)
  } else {
    fbq('trackCustom', eventName)
  }
}

/**
 * Read Meta cookies (_fbp, _fbc) for server-side CAPI deduplication.
 */
export function getMetaCookies(): { fbp?: string; fbc?: string } {
  const cookies = document.cookie.split(';').reduce((acc, c) => {
    const [key, ...rest] = c.trim().split('=')
    acc[key] = rest.join('=')
    return acc
  }, {} as Record<string, string>)

  return {
    fbp: cookies['_fbp'] || undefined,
    fbc: cookies['_fbc'] || undefined,
  }
}
