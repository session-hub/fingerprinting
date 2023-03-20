import { Component, UnknownComponents } from './utils/entropy_source'
import { x64hash128 } from './utils/hashing'
import session from './session'

// Exports that are under Semantic versioning
export {
  Component,
  UnknownComponents,
  session,
}
// The default export is a syntax sugar (`import * as FP from '...' → import FP from '...'`).
// It should contain all the public exported values.

export default { session }

// The exports below are for private usage. They may change unexpectedly. Use them at your own risk.
/** Not documented, out of Semantic Versioning, usage is at your own risk */
export const murmurX64Hash128 = x64hash128

export { getScreenFrame } from './sources/screen_frame'
export {
  getFullscreenElement,
  isAndroid,
  isTrident,
  isEdgeHTML,
  isChromium,
  isWebKit,
  isGecko,
  isDesktopSafari,
} from './utils/browser'
