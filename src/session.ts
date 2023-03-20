import { Component, UnknownComponents } from './utils/entropy_source'
import { x64hash128 } from './utils/hashing'

import getAudioFingerprint from './sources/audio'
import getFonts from './sources/fonts'
import getPlugins from './sources/plugins'
import getCanvasFingerprint from './sources/canvas'
import getTouchSupport from './sources/touch_support'
import getOsCpu from './sources/os_cpu'
import getLanguages from './sources/languages'
import getColorDepth from './sources/color_depth'
import getDeviceMemory from './sources/device_memory'
import getScreenResolution from './sources/screen_resolution'
import { getRoundedScreenFrame } from './sources/screen_frame'
import getHardwareConcurrency from './sources/hardware_concurrency'
import getTimezone from './sources/timezone'
import getSessionStorage from './sources/session_storage'
import getLocalStorage from './sources/local_storage'
import getIndexedDB from './sources/indexed_db'
import getOpenDatabase from './sources/open_database'
import getCpuClass from './sources/cpu_class'
import getPlatform from './sources/platform'
import getVendor from './sources/vendor'
import getVendorFlavors from './sources/vendor_flavors'
import areCookiesEnabled from './sources/cookies_enabled'
import getDomBlockers from './sources/dom_blockers'
import getColorGamut from './sources/color_gamut'
import areColorsInverted from './sources/inverted_colors'
import areColorsForced from './sources/forced_colors'
import getMonochromeDepth from './sources/monochrome'
import getContrastPreference from './sources/contrast'
import isMotionReduced from './sources/reduced_motion'
import isHDR from './sources/hdr'
import getMathFingerprint from './sources/math'
import getFontPreferences from './sources/font_preferences'
import getVideoCard from './sources/video_card'
import isPdfViewerEnabled from './sources/pdf_viewer_enabled'
import getArchitecture from './sources/architecture'

import {
    awaitIfAsync,
    forEachWithBreaks,
    MaybePromise,
    suppressUnhandledRejectionWarning,
    wait,
  } from './utils/async'
import { excludes } from './utils/data'


async function getToken(email: string): Promise<String> {
    const visitorId = await getHash();
    const components = await getComponents();

    const token = await fetch('http://localhost:8000/api/sessions/fingerprint/', {
        method: "POST",
        mode: "cors",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            'email': email,
            'fingerprint': components,
            'fingerprint_hash': visitorId
        })
    })
        .then(response => response.json())

    return token
}

// VISITORIDS
function componentsToCanonicalString(components: UnknownComponents) {
    let result = ''
    for (const componentKey of Object.keys(components).sort()) {
        const component = components[componentKey]
        const value = component.error ? 'error' : JSON.stringify(component.value)
        result += `${result ? '|' : ''}${componentKey.replace(/([:|\\])/g, '\\$1')}:${value}`
    }
    return result
}

function hashComponents(components: Record<string, Component<unknown>>): string {
    return x64hash128(componentsToCanonicalString(components))
}


async function getHash(): Promise<string> {
    return hashComponents(await getComponents());
}

// COMPONENTS

/**
 * List of components from the built-in entropy sources.
 *
 * Warning! This type is out of Semantic Versioning, i.e. may have incompatible changes within a major version. If you
 * want to avoid breaking changes, use `UnknownComponents` instead that is more generic but guarantees backward
 * compatibility within a major version. This is because browsers change constantly and therefore entropy sources have
 * to change too.
 */
 type BuiltinComponents = SourcesToComponents<typeof sources>

interface BuiltinSourceOptions {
    debug?: boolean
}

/**
 * The list of entropy sources used to make visitor identifiers.
 *
 * This value isn't restricted by Semantic Versioning, i.e. it may be changed without bumping minor or major version of
 * this package.
 *
 * Note: Rollup and Webpack are smart enough to remove unused properties of this object during tree-shaking, so there is
 * no need to export the sources individually.
 */
 export const sources = {
    // READ FIRST:
    // See https://github.com/fingerprintjs/fingerprintjs/blob/master/contributing.md#how-to-make-an-entropy-source
    // to learn how entropy source works and how to make your own.
  
    // The sources run in this exact order.
    // The asynchronous sources are at the start to run in parallel with other sources.
    fonts: getFonts,
    domBlockers: getDomBlockers,
    fontPreferences: getFontPreferences,
    audio: getAudioFingerprint,
    screenFrame: getRoundedScreenFrame,
  
    osCpu: getOsCpu,
    languages: getLanguages,
    colorDepth: getColorDepth,
    deviceMemory: getDeviceMemory,
    screenResolution: getScreenResolution,
    hardwareConcurrency: getHardwareConcurrency,
    timezone: getTimezone,
    sessionStorage: getSessionStorage,
    localStorage: getLocalStorage,
    indexedDB: getIndexedDB,
    openDatabase: getOpenDatabase,
    cpuClass: getCpuClass,
    platform: getPlatform,
    plugins: getPlugins,
    canvas: getCanvasFingerprint,
    touchSupport: getTouchSupport,
    vendor: getVendor,
    vendorFlavors: getVendorFlavors,
    cookiesEnabled: areCookiesEnabled,
    colorGamut: getColorGamut,
    invertedColors: areColorsInverted,
    forcedColors: areColorsForced,
    monochrome: getMonochromeDepth,
    contrast: getContrastPreference,
    reducedMotion: isMotionReduced,
    hdr: isHDR,
    math: getMathFingerprint,
    videoCard: getVideoCard,
    pdfViewerEnabled: isPdfViewerEnabled,
    architecture: getArchitecture,
  }

function loadBuiltinSources(options: BuiltinSourceOptions): () => Promise<BuiltinComponents> {
    return loadSources(sources, options, [])
}

async function getComponents(): Promise<BuiltinComponents> {
    const debug = true
    const func = loadBuiltinSources({ debug })

    return await func();
}

/**
 * A functions that returns data with entropy to identify visitor.
 *
 * See https://github.com/fingerprintjs/fingerprintjs/blob/master/contributing.md#how-to-make-an-entropy-source
 * to learn how entropy source works and how to make your own.
 */
 export type Source<TOptions, TValue> = (options: TOptions) => MaybePromise<TValue | (() => MaybePromise<TValue>)>


/**
 * Generic dictionary of unknown sources
 */
 export type UnknownSources<TOptions> = Record<string, Source<TOptions, unknown>>

 /**
 * Converts an entropy source type into the component type
 */
export type SourceValue<TSource extends Source<any, any>> = TSource extends Source<any, infer T> ? T : never


/**
 * Converts an entropy source list type to a corresponding component list type.
 *
 * Warning for package users:
 * This type is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
 export type SourcesToComponents<TSources extends UnknownSources<any>> = {
    [K in keyof TSources]: Component<SourceValue<TSources[K]>>
  }

  function ensureErrorWithMessage(error: unknown): { message: unknown } {
    return error && typeof error === 'object' && 'message' in error ? (error as { message: unknown }) : { message: error }
  }


function isFinalResultLoaded<TValue>(loadResult: TValue | (() => MaybePromise<TValue>)): loadResult is TValue {
    return typeof loadResult !== 'function'
  }

/**
 * Loads the given entropy source. Returns a function that gets an entropy component from the source.
 *
 * The result is returned synchronously to prevent `loadSources` from
 * waiting for one source to load before getting the components from the other sources.
 */
 export function loadSource<TOptions, TValue>(
    source: Source<TOptions, TValue>,
    sourceOptions: TOptions,
  ): () => Promise<Component<TValue>> {
    const sourceLoadPromise = new Promise<() => MaybePromise<Component<TValue>>>((resolveLoad) => {
      const loadStartTime = Date.now()
  
      // `awaitIfAsync` is used instead of just `await` in order to measure the duration of synchronous sources
      // correctly (other microtasks won't affect the duration).
      awaitIfAsync(source.bind(null, sourceOptions), (...loadArgs) => {
        const loadDuration = Date.now() - loadStartTime
  
        // Source loading failed
        if (!loadArgs[0]) {
          return resolveLoad(() => ({ error: ensureErrorWithMessage(loadArgs[1]), duration: loadDuration }))
        }
  
        const loadResult = loadArgs[1]
  
        // Source loaded with the final result
        if (isFinalResultLoaded(loadResult)) {
          return resolveLoad(() => ({ value: loadResult, duration: loadDuration }))
        }
  
        // Source loaded with "get" stage
        resolveLoad(
          () =>
            new Promise<Component<TValue>>((resolveGet) => {
              const getStartTime = Date.now()
  
              awaitIfAsync(loadResult, (...getArgs) => {
                const duration = loadDuration + Date.now() - getStartTime
  
                // Source getting failed
                if (!getArgs[0]) {
                  return resolveGet({ error: ensureErrorWithMessage(getArgs[1]), duration })
                }
  
                // Source getting succeeded
                resolveGet({ value: getArgs[1], duration })
              })
            }),
        )
      })
    })
  
    suppressUnhandledRejectionWarning(sourceLoadPromise)
  
    return function getComponent() {
      return sourceLoadPromise.then((finalizeSource) => finalizeSource())
    }
  }


/**
 * Loads the given entropy sources. Returns a function that collects the entropy components.
 *
 * The result is returned synchronously in order to allow start getting the components
 * before the sources are loaded completely.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
 export function loadSources<TSourceOptions, TSources extends UnknownSources<TSourceOptions>, TExclude extends string>(
    sources: TSources,
    sourceOptions: TSourceOptions,
    excludeSources: readonly TExclude[],
  ): () => Promise<Omit<SourcesToComponents<TSources>, TExclude>> {
    const includedSources = Object.keys(sources).filter((sourceKey) => excludes(excludeSources, sourceKey)) as Exclude<
      keyof TSources,
      TExclude
    >[]
    const sourceGetters = Array<() => Promise<Component<any>>>(includedSources.length)
  
    // Using `forEachWithBreaks` allows asynchronous sources to complete between synchronous sources
    // and measure the duration correctly
    forEachWithBreaks(includedSources, (sourceKey, index) => {
      sourceGetters[index] = loadSource(sources[sourceKey], sourceOptions)
    })
  
    return async function getComponents() {
      // Add the keys immediately to keep the component keys order the same as the source keys order
      const components = {} as Omit<SourcesToComponents<TSources>, TExclude>
      for (const sourceKey of includedSources) {
        components[sourceKey] = undefined as any
      }
  
      const componentPromises = Array<Promise<unknown>>(includedSources.length)
  
      for (;;) {
        let hasAllComponentPromises = true
        await forEachWithBreaks(includedSources, (sourceKey, index) => {
          if (!componentPromises[index]) {
            // `sourceGetters` may be incomplete at this point of execution because `forEachWithBreaks` is asynchronous
            if (sourceGetters[index]) {
              const componentPromise = sourceGetters[index]().then((component) => (components[sourceKey] = component))
              suppressUnhandledRejectionWarning(componentPromise)
              componentPromises[index] = componentPromise
            } else {
              hasAllComponentPromises = false
            }
          }
        })
        if (hasAllComponentPromises) {
          break
        }
        await wait(1) // Lets the source load loop continue
      }
  
      await Promise.all(componentPromises)
      return components
    }
  }

  export default { getToken, getHash, getComponents }
