// Watch brand profiles — a modular registry of real, documented BLE protocols.
// Each profile defines how to discover and parse data from a specific brand.
// New brands can be added by creating a new WatchProfile and registering it.
//
// IMPORTANT: Only real, publicly documented BLE service/characteristic UUIDs are used.
// No UUIDs are invented. If a brand uses proprietary protocols not publicly documented,
// we mark it as "requires companion app" and explain what's needed.

export interface BrandCharacteristicSpec {
  uuid: string;
  name: string;
  // Parser function type — takes a DataView and returns a parsed value or null
  parser?: 'heart_rate' | 'battery' | 'text' | 'uint8' | 'uint16_le' | 'uint32_le' | 'raw_hex';
  // Which WatchData field this characteristic maps to
  mapsTo?: 'steps' | 'heartRate' | 'calories' | 'distance' | 'battery' | 'sleep_hours' | 'sleep_minutes';
}

export interface BrandServiceSpec {
  uuid: string;
  name: string;
  characteristics: BrandCharacteristicSpec[];
}

export interface WatchProfile {
  id: string;
  brand: string;
  // Name prefixes that Web Bluetooth can filter by when scanning
  namePrefixes: string[];
  // Human-readable description of what this profile supports
  description: string;
  // The GATT services and characteristics this brand exposes (only documented ones)
  services: BrandServiceSpec[];
  // Standard BLE services this brand also supports (heart rate, battery, etc.)
  usesStandardServices: boolean;
  // Whether this brand requires a native companion app for full data access
  requiresCompanionApp?: boolean;
  // Explanation of limitations if companion app required
  companionAppNote?: string;
  // Link to the official protocol documentation or developer page
  docsUrl?: string;
}

// ── Standard BLE service UUIDs (Bluetooth SIG assigned) ──────────────────────
export const STANDARD_SERVICE_UUIDS = {
  GENERIC_ACCESS: '00001800-0000-1000-8000-00805f9b34fb',
  GENERIC_ATTRIBUTE: '00001801-0000-1000-8000-00805f9b34fb',
  HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
  DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb',
  BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
  CURRENT_TIME: '00001805-0000-1000-8000-00805f9b34fb',
  RUNNING_SPEED_CADENCE: '00001814-0000-1000-8000-00805f9b34fb',
  CYCLING_SPEED_CADENCE: '00001816-0000-1000-8000-00805f9b34fb',
  CYCLING_POWER: '00001818-0000-1000-8000-00805f9b34fb',
  USER_DATA: '0000181c-0000-1000-8000-00805f9b34fb',
  WEIGHT_SCALE: '0000181d-0000-1000-8000-00805f9b34fb',
  FITNESS_MACHINE: '00001826-0000-1000-8000-00805f9b34fb',
} as const;

export const STANDARD_CHARACTERISTIC_UUIDS = {
  DEVICE_NAME: '00002a00-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
  SYSTEM_ID: '00002a23-0000-1000-8000-00805f9b34fb',
  MODEL_NUMBER: '00002a24-0000-1000-8000-00805f9b34fb',
  FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
  SOFTWARE_REVISION: '00002a28-0000-1000-8000-00805f9b34fb',
  MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  BODY_SENSOR_LOCATION: '00002a38-0000-1000-8000-00805f9b34fb',
  CURRENT_TIME: '00002a2b-0000-1000-8000-00805f9b34fb',
} as const;

// ── Brand Profiles ───────────────────────────────────────────────────────────

// Generic profile — works with any BLE device that exposes standard health services.
// This is the fallback for watches not matching a specific brand profile.
const genericProfile: WatchProfile = {
  id: 'generic',
  brand: 'Generic BLE Watch',
  namePrefixes: [],
  description:
    'Connects to any smartwatch or fitness band that exposes standard Bluetooth health services (Heart Rate, Battery, Device Info). Steps, calories, distance, and sleep require brand-specific protocols.',
  usesStandardServices: true,
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BODY_SENSOR_LOCATION, name: 'Body Sensor Location', parser: 'text' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.DEVICE_INFO,
      name: 'Device Information',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MANUFACTURER_NAME, name: 'Manufacturer Name', parser: 'text' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MODEL_NUMBER, name: 'Model Number', parser: 'text' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.FIRMWARE_REVISION, name: 'Firmware Revision', parser: 'text' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.SYSTEM_ID, name: 'System ID', parser: 'raw_hex' },
      ],
    },
  ],
};

// Garmin — uses standard BLE Heart Rate and Device Info. Full activity data
// (steps, sleep, calories) requires the Garmin Connect IQ SDK or companion app.
// Docs: https://developer.garmin.com/connect-iq/
const garminProfile: WatchProfile = {
  id: 'garmin',
  brand: 'Garmin',
  namePrefixes: ['Garmin', 'Forerunner', 'Fenix', 'Venu', 'Vivoactive', 'Instinct', 'Edge', ' approach'],
  description:
    'Heart rate and battery via standard BLE. Steps, sleep, calories, and distance use Garmin\'s proprietary protocol and require the Garmin Connect app to sync first.',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote:
    'Steps, sleep, calories, and distance are stored in Garmin\'s proprietary format. Sync your watch with the Garmin Connect app first, then connect here to read heart rate and battery in real time.',
  docsUrl: 'https://developer.garmin.com/connect-iq/',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.DEVICE_INFO,
      name: 'Device Information',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MANUFACTURER_NAME, name: 'Manufacturer Name', parser: 'text' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MODEL_NUMBER, name: 'Model Number', parser: 'text' },
      ],
    },
  ],
};

// Fitbit — exposes standard BLE Heart Rate. Full activity data requires the
// Fitbit Web API (OAuth). Docs: https://dev.fitbit.com/build/reference/
const fitbitProfile: WatchProfile = {
  id: 'fitbit',
  brand: 'Fitbit',
  namePrefixes: ['Fitbit', 'Ionic', 'Versa', 'Sense', 'Charge', 'Inspire', 'Ace', 'Lux'],
  description:
    'Heart rate and battery via standard BLE. Steps, sleep, calories, and distance require the Fitbit Web API with OAuth authorization.',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote:
    'Activity data (steps, sleep, calories) is only available through the Fitbit Web API, which requires a Fitbit Developer account and OAuth. This BLE connection can read heart rate and battery in real time.',
  docsUrl: 'https://dev.fitbit.com/build/reference/',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
  ],
};

// Apple Watch — does NOT support standard BLE GATT server for health data.
// Apple uses the HealthKit API on iOS/macOS. Web Bluetooth cannot read Apple Watch data.
const appleWatchProfile: WatchProfile = {
  id: 'apple_watch',
  brand: 'Apple Watch',
  namePrefixes: ['Apple Watch'],
  description:
    'Apple Watch does not expose health data through standard BLE GATT. It requires a native iOS app using the HealthKit framework. Web Bluetooth cannot read Apple Watch health data.',
  usesStandardServices: false,
  requiresCompanionApp: true,
  companionAppNote:
    'Apple Watch health data (heart rate, steps, sleep, calories) is only accessible through the HealthKit API on iOS. A native iOS app is required — web browsers cannot read this data over Bluetooth.',
  docsUrl: 'https://developer.apple.com/healthkit/',
  services: [],
};

// Samsung Galaxy Watch / Gear — uses Samsung's proprietary protocol (Tizen).
// Standard BLE heart rate may be available on some models.
const samsungProfile: WatchProfile = {
  id: 'samsung',
  brand: 'Samsung Galaxy Watch',
  namePrefixes: ['Galaxy Watch', 'Galaxy Buds', 'Gear', 'SM-'],
  description:
    'Heart rate may be available via standard BLE on some models. Full activity data requires Samsung Health SDK or the Samsung companion app.',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote:
    'Steps, sleep, calories, and distance use Samsung\'s proprietary Tizen protocol. Sync with the Samsung Health app first. Heart rate may be readable via BLE on supported models.',
  docsUrl: 'https://developer.samsung.com/health',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
  ],
};

// Xiaomi Mi Band / Amazfit — uses standard BLE Heart Rate on most models.
// Steps and activity data use Xiaomi's proprietary Mi Band protocol.
// Docs: https://github.com/Freeyourgadget/Gadgetbridge/wiki/Mi-Band-1
const xiaomiProfile: WatchProfile = {
  id: 'xiaomi',
  brand: 'Xiaomi / Amazfit',
  namePrefixes: ['Mi Band', 'Mi Smart', 'Amazfit', 'Xiaomi'],
  description:
    'Heart rate and battery via standard BLE. Steps, sleep, and calories use Xiaomi\'s Mi Band protocol (partially documented by the Gadgetbridge project).',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote:
    'Activity data uses Xiaomi\'s proprietary Mi Band protocol. The open-source Gadgetbridge project has partially documented it, but a web browser cannot reliably read steps/sleep without the Xiaomi Wear/Zepp companion app syncing first.',
  docsUrl: 'https://github.com/Freeyourgadget/Gadgetbridge',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.DEVICE_INFO,
      name: 'Device Information',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MANUFACTURER_NAME, name: 'Manufacturer Name', parser: 'text' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MODEL_NUMBER, name: 'Model Number', parser: 'text' },
      ],
    },
  ],
};

// Withings — exposes standard BLE Heart Rate and Battery.
// Full activity data via the Withings API (OAuth).
// Docs: https://developer.withings.com/
const withingsProfile: WatchProfile = {
  id: 'withings',
  brand: 'Withings',
  namePrefixes: ['Withings', 'Pulse', 'Move', 'ScanWatch', 'Steel HR'],
  description:
    'Heart rate and battery via standard BLE. Steps, sleep, and calories require the Withings API with OAuth.',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote:
    'Activity data is available through the Withings API, which requires a developer account and OAuth. BLE can read heart rate and battery.',
  docsUrl: 'https://developer.withings.com/',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
  ],
};

// Polar — well-documented BLE GATT profiles. Heart rate and battery via standard BLE.
// Docs: https://github.com/polarofficial/polar-ble-sdk
const polarProfile: WatchProfile = {
  id: 'polar',
  brand: 'Polar',
  namePrefixes: ['Polar', 'H10', 'H9', 'OH1', 'Verity', 'Ignite', 'Vantage', 'Pacer'],
  description:
    'Heart rate and battery via standard BLE. Polar devices are known for excellent BLE GATT compliance. Some models expose additional data through Polar\'s SDK.',
  usesStandardServices: true,
  docsUrl: 'https://github.com/polarofficial/polar-ble-sdk',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BODY_SENSOR_LOCATION, name: 'Body Sensor Location', parser: 'text' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.DEVICE_INFO,
      name: 'Device Information',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MANUFACTURER_NAME, name: 'Manufacturer Name', parser: 'text' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.MODEL_NUMBER, name: 'Model Number', parser: 'text' },
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.FIRMWARE_REVISION, name: 'Firmware Revision', parser: 'text' },
      ],
    },
  ],
};

// Wahoo — standard BLE Heart Rate and Fitness Machine services.
const wahooProfile: WatchProfile = {
  id: 'wahoo',
  brand: 'Wahoo',
  namePrefixes: ['Wahoo', 'TICKR', 'ELEMNT'],
  description:
    'Heart rate via standard BLE. Wahoo devices comply well with Bluetooth SIG standards.',
  usesStandardServices: true,
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
  ],
};

// Coros — exposes standard BLE Heart Rate on most models.
const corosProfile: WatchProfile = {
  id: 'coros',
  brand: 'Coros',
  namePrefixes: ['Coros', 'PACE', 'APEX', 'VERTIX'],
  description:
    'Heart rate and battery via standard BLE. Full activity data requires the Coros companion app.',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote: 'Steps, sleep, and calories require the Corus app to sync. Heart rate and battery are readable via BLE.',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
  ],
};

// Suunto — standard BLE Heart Rate and Battery.
const suuntoProfile: WatchProfile = {
  id: 'suunto',
  brand: 'Suunto',
  namePrefixes: ['Suunto'],
  description: 'Heart rate and battery via standard BLE. Activity data via the Suunto app.',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote: 'Steps, sleep, and calories require the Suunto app. Heart rate and battery are readable via BLE.',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
  ],
};

// Huawei Band / Watch — standard BLE Heart Rate on most models.
const huaweiProfile: WatchProfile = {
  id: 'huawei',
  brand: 'Huawei',
  namePrefixes: ['Huawei', 'HUAWEI', 'Band', 'GT'],
  description: 'Heart rate and battery via standard BLE. Full activity data requires Huawei Health app.',
  usesStandardServices: true,
  requiresCompanionApp: true,
  companionAppNote: 'Steps, sleep, and calories require the Huawei Health app. Heart rate and battery are readable via BLE.',
  services: [
    {
      uuid: STANDARD_SERVICE_UUIDS.HEART_RATE,
      name: 'Heart Rate Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT, name: 'Heart Rate Measurement', parser: 'heart_rate', mapsTo: 'heartRate' },
      ],
    },
    {
      uuid: STANDARD_SERVICE_UUIDS.BATTERY,
      name: 'Battery Service',
      characteristics: [
        { uuid: STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL, name: 'Battery Level', parser: 'battery', mapsTo: 'battery' },
      ],
    },
  ],
};

// ── Registry ─────────────────────────────────────────────────────────────────

export const WATCH_PROFILES: WatchProfile[] = [
  garminProfile,
  fitbitProfile,
  appleWatchProfile,
  samsungProfile,
  xiaomiProfile,
  withingsProfile,
  polarProfile,
  wahooProfile,
  corosProfile,
  suuntoProfile,
  huaweiProfile,
  genericProfile, // always last — fallback
];

// Match a device name to a brand profile. Returns the generic profile if no match.
export function matchProfile(deviceName: string): WatchProfile {
  const name = deviceName.toLowerCase().trim();
  for (const profile of WATCH_PROFILES) {
    if (profile.id === 'generic') continue;
    for (const prefix of profile.namePrefixes) {
      if (name.startsWith(prefix.toLowerCase().trim())) {
        return profile;
      }
    }
  }
  return genericProfile;
}

// Get all name prefixes from all profiles (for scanning filters)
export function getAllNamePrefixes(): string[] {
  const prefixes: string[] = [];
  for (const profile of WATCH_PROFILES) {
    prefixes.push(...profile.namePrefixes);
  }
  return prefixes;
}

// All optional services we request when connecting — union of all profiles
// plus all standard services so we can discover anything the watch exposes.
export function getAllOptionalServices(): string[] {
  const uuids = new Set<string>();
  for (const profile of WATCH_PROFILES) {
    for (const svc of profile.services) {
      uuids.add(svc.uuid);
    }
  }
  // Always include all standard services for discovery
  for (const uuid of Object.values(STANDARD_SERVICE_UUIDS)) {
    uuids.add(uuid);
  }
  return Array.from(uuids);
}

export function getProfileById(id: string): WatchProfile | undefined {
  return WATCH_PROFILES.find((p) => p.id === id);
}
