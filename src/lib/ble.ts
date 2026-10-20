// BLE utility module — uses real standard GATT service/characteristic UUIDs only.
// No invented UUIDs. All health data is read from the actual watch GATT server.
// Brand-specific behavior is driven by the modular watch-profiles registry.

import type {
  BluetoothDevice,
  BluetoothRemoteGATTServer,
  BluetoothRemoteGATTCharacteristic,
  BluetoothRequestDeviceFilter,
} from '@/types/web-bluetooth';
import {
  STANDARD_SERVICE_UUIDS,
  STANDARD_CHARACTERISTIC_UUIDS,
  getAllOptionalServices,
  getAllNamePrefixes,
  matchProfile,
  type WatchProfile,
  type BrandCharacteristicSpec,
} from '@/lib/watch-profiles';

export { STANDARD_SERVICE_UUIDS, STANDARD_CHARACTERISTIC_UUIDS } from '@/lib/watch-profiles';
export { matchProfile, getAllOptionalServices, getAllNamePrefixes, WATCH_PROFILES } from '@/lib/watch-profiles';
export type { WatchProfile } from '@/lib/watch-profiles';

export interface WatchData {
  steps: number | null;
  heartRate: number | null;
  calories: number | null;
  distance: number | null;
  battery: number | null;
  sleep: { hours: number; minutes: number } | null;
}

export interface DiscoveredCharacteristic {
  uuid: string;
  name: string;
  readable: boolean;
  writable: boolean;
  notifiable: boolean;
  value: string | null;
}

export interface DiscoveredService {
  uuid: string;
  name: string;
  characteristics: DiscoveredCharacteristic[];
}

export interface WatchConnection {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  profile: WatchProfile;
}

// Human-readable names for known standard service UUIDs
const SERVICE_NAMES: Record<string, string> = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
  '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
  '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
  '00001805-0000-1000-8000-00805f9b34fb': 'Current Time',
  '00001814-0000-1000-8000-00805f9b34fb': 'Running Speed and Cadence',
  '00001816-0000-1000-8000-00805f9b34fb': 'Cycling Speed and Cadence',
  '00001818-0000-1000-8000-00805f9b34fb': 'Cycling Power',
  '0000181c-0000-1000-8000-00805f9b34fb': 'User Data',
  '0000181d-0000-1000-8000-00805f9b34fb': 'Weight Scale',
  '00001826-0000-1000-8000-00805f9b34fb': 'Fitness Machine',
};

const CHARACTERISTIC_NAMES: Record<string, string> = {
  '00002a00-0000-1000-8000-00805f9b34fb': 'Device Name',
  '00002a01-0000-1000-8000-00805f9b34fb': 'Appearance',
  '00002a04-0000-1000-8000-00805f9b34fb': 'Peripheral Preferred Connection Params',
  '00002a19-0000-1000-8000-00805f9b34fb': 'Battery Level',
  '00002a23-0000-1000-8000-00805f9b34fb': 'System ID',
  '00002a24-0000-1000-8000-00805f9b34fb': 'Model Number',
  '00002a26-0000-1000-8000-00805f9b34fb': 'Firmware Revision',
  '00002a28-0000-1000-8000-00805f9b34fb': 'Software Revision',
  '00002a29-0000-1000-8000-00805f9b34fb': 'Manufacturer Name',
  '00002a37-0000-1000-8000-00805f9b34fb': 'Heart Rate Measurement',
  '00002a38-0000-1000-8000-00805f9b34fb': 'Body Sensor Location',
  '00002a2b-0000-1000-8000-00805f9b34fb': 'Current Time',
};

export function getServiceName(uuid: string): string {
  return SERVICE_NAMES[uuid] || `Unknown Service (${uuid})`;
}

export function getCharacteristicName(uuid: string): string {
  return CHARACTERISTIC_NAMES[uuid] || `Unknown Characteristic (${uuid})`;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.bluetooth !== 'undefined';
}

// ── Parsers ──────────────────────────────────────────────────────────────────

// Parse heart rate measurement (standard BLE HR spec, GATT characteristic 0x2A37)
export function parseHeartRate(value: DataView): number | null {
  if (value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  const is16bit = (flags & 0x01) === 1;
  try {
    if (is16bit && value.byteLength >= 3) return value.getUint16(1, true);
    return value.getUint8(1);
  } catch {
    return null;
  }
}

// Parse battery level (uint8 percentage 0-100, GATT characteristic 0x2A19)
export function parseBatteryLevel(value: DataView): number | null {
  if (value.byteLength < 1) return null;
  try {
    return value.getUint8(0);
  } catch {
    return null;
  }
}

export function parseTextValue(value: DataView): string | null {
  try {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(value);
  } catch {
    return null;
  }
}

function parseUInt8(value: DataView): number | null {
  if (value.byteLength < 1) return null;
  try { return value.getUint8(0); } catch { return null; }
}

function parseUInt16LE(value: DataView): number | null {
  if (value.byteLength < 2) return null;
  try { return value.getUint16(0, true); } catch { return null; }
}

function parseUInt32LE(value: DataView): number | null {
  if (value.byteLength < 4) return null;
  try { return value.getUint32(0, true); } catch { return null; }
}

function toRawHex(value: DataView): string {
  const bytes: string[] = [];
  for (let i = 0; i < value.byteLength && i < 20; i++) {
    bytes.push(value.getUint8(i).toString(16).padStart(2, '0'));
  }
  return bytes.join(' ');
}

// Parse a characteristic value using the spec's parser type
function parseByType(value: DataView, parser: BrandCharacteristicSpec['parser']): string | null {
  if (!parser) return null;
  switch (parser) {
    case 'heart_rate': {
      const hr = parseHeartRate(value);
      return hr !== null ? `${hr} bpm` : null;
    }
    case 'battery': {
      const bat = parseBatteryLevel(value);
      return bat !== null ? `${bat}%` : null;
    }
    case 'text':
      return parseTextValue(value);
    case 'uint8': {
      const v = parseUInt8(value);
      return v !== null ? String(v) : null;
    }
    case 'uint16_le': {
      const v = parseUInt16LE(value);
      return v !== null ? String(v) : null;
    }
    case 'uint32_le': {
      const v = parseUInt32LE(value);
      return v !== null ? String(v) : null;
    }
    case 'raw_hex':
      return toRawHex(value);
    default:
      return null;
  }
}

// Extract numeric value from a parsed string like "72 bpm" or "85%" or "1234"
function extractNumber(str: string | null): number | null {
  if (!str) return null;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ── Discovery ────────────────────────────────────────────────────────────────

// Discover all GATT services and characteristics on the connected device.
export async function discoverServices(
  server: BluetoothRemoteGATTServer,
  profile: WatchProfile,
): Promise<DiscoveredService[]> {
  const services = await server.getPrimaryServices();
  const result: DiscoveredService[] = [];

  // Build a lookup map from the profile: uuid -> characteristic spec
  const profileCharMap = new Map<string, BrandCharacteristicSpec>();
  for (const svc of profile.services) {
    for (const ch of svc.characteristics) {
      profileCharMap.set(ch.uuid.toLowerCase(), ch);
    }
  }

  for (const service of services) {
    const svc: DiscoveredService = {
      uuid: service.uuid,
      name: getServiceName(service.uuid),
      characteristics: [],
    };

    try {
      const characteristics = await service.getCharacteristics();
      for (const ch of characteristics) {
        let valueStr: string | null = null;
        if (ch.properties.read) {
          try {
            const dv = await ch.readValue();
            const spec = profileCharMap.get(ch.uuid.toLowerCase());
            if (spec && spec.parser) {
              valueStr = parseByType(dv, spec.parser);
            } else if (dv.byteLength <= 20) {
              valueStr = toRawHex(dv);
            }
          } catch {
            // Some readable characteristics may error at this time
          }
        }

        svc.characteristics.push({
          uuid: ch.uuid,
          name: getCharacteristicName(ch.uuid),
          readable: ch.properties.read,
          writable: ch.properties.write || ch.properties.writeWithoutResponse,
          notifiable: ch.properties.notify || ch.properties.indicate,
          value: valueStr,
        });
      }
    } catch {
      // Some services may not allow characteristic enumeration
    }

    result.push(svc);
  }

  return result;
}

// Read all available health data from the watch using the matched profile.
// Only fields that have a corresponding characteristic on the device will be populated.
// Everything else stays null — we do NOT invent or fake any data.
export async function readWatchData(
  server: BluetoothRemoteGATTServer,
  profile: WatchProfile,
): Promise<{ data: WatchData; services: DiscoveredService[] }> {
  const data: WatchData = {
    steps: null,
    heartRate: null,
    calories: null,
    distance: null,
    battery: null,
    sleep: null,
  };

  const services = await discoverServices(server, profile);

  // Build a lookup from profile: characteristic uuid -> mapsTo field
  const fieldMap = new Map<string, string>();
  for (const svc of profile.services) {
    for (const ch of svc.characteristics) {
      if (ch.mapsTo) {
        fieldMap.set(ch.uuid.toLowerCase(), ch.mapsTo);
      }
    }
  }

  // Walk discovered services and extract data from matching characteristics
  for (const svc of services) {
    for (const ch of svc.characteristics) {
      const fieldName = fieldMap.get(ch.uuid.toLowerCase());
      if (!fieldName || !ch.value) continue;
      const numVal = extractNumber(ch.value);
      if (numVal === null) continue;

      switch (fieldName) {
        case 'heartRate': data.heartRate = numVal; break;
        case 'battery': data.battery = numVal; break;
        case 'steps': data.steps = numVal; break;
        case 'calories': data.calories = numVal; break;
        case 'distance': data.distance = numVal; break;
        case 'sleep_hours':
          data.sleep = data.sleep || { hours: 0, minutes: 0 };
          data.sleep.hours = numVal;
          break;
        case 'sleep_minutes':
          data.sleep = data.sleep || { hours: 0, minutes: 0 };
          data.sleep.minutes = numVal;
          break;
      }
    }
  }

  // Clear sleep if both components are 0 (not actually provided)
  if (data.sleep && data.sleep.hours === 0 && data.sleep.minutes === 0) {
    data.sleep = null;
  }

  return { data, services };
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function subscribeToHeartRate(
  server: BluetoothRemoteGATTServer,
  onHeartRate: (bpm: number) => void,
): Promise<(() => void) | null> {
  try {
    const service = await server.getPrimaryService(STANDARD_SERVICE_UUIDS.HEART_RATE);
    const characteristic = await service.getCharacteristic(
      STANDARD_CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT,
    );

    const handler = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (target.value) {
        const hr = parseHeartRate(target.value);
        if (hr !== null) onHeartRate(hr);
      }
    };

    characteristic.addEventListener('characteristicvaluechanged', handler);
    await characteristic.startNotifications();

    return () => {
      characteristic.removeEventListener('characteristicvaluechanged', handler);
      characteristic.stopNotifications().catch(() => {});
    };
  } catch {
    return null;
  }
}

export async function subscribeToBattery(
  server: BluetoothRemoteGATTServer,
  onBattery: (level: number) => void,
): Promise<(() => void) | null> {
  try {
    const service = await server.getPrimaryService(STANDARD_SERVICE_UUIDS.BATTERY);
    const characteristic = await service.getCharacteristic(
      STANDARD_CHARACTERISTIC_UUIDS.BATTERY_LEVEL,
    );

    const handler = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (target.value) {
        const level = parseBatteryLevel(target.value);
        if (level !== null) onBattery(level);
      }
    };

    characteristic.addEventListener('characteristicvaluechanged', handler);
    await characteristic.startNotifications();

    return () => {
      characteristic.removeEventListener('characteristicvaluechanged', handler);
      characteristic.stopNotifications().catch(() => {});
    };
  } catch {
    return null;
  }
}

// ── Connection ───────────────────────────────────────────────────────────────

// Request a device from the user. Uses acceptAllDevices so any BLE watch can be
// selected, plus optionalServices so we can read whatever the watch exposes.
// Also provides name-prefix filters for known brands to help the user find their watch.
export async function requestWatchDevice(): Promise<BluetoothDevice> {
  const optionalServices = getAllOptionalServices();
  const namePrefixes = getAllNamePrefixes();

  // Build filters from known brand name prefixes
  const filters: BluetoothRequestDeviceFilter[] = namePrefixes.map((prefix) => ({ namePrefix: prefix }));
  // Also add a filter for devices that expose the Heart Rate service
  filters.push({ services: [STANDARD_SERVICE_UUIDS.HEART_RATE] });
  // And devices that expose Battery service
  filters.push({ services: [STANDARD_SERVICE_UUIDS.BATTERY] });

  return navigator.bluetooth!.requestDevice({
    filters,
    optionalServices,
  });
}
