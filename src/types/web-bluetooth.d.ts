// Web Bluetooth API type declarations
// Based on the W3C Web Bluetooth specification

export interface BluetoothServiceData {
  [key: string]: DataView;
}

export interface BluetoothManufacturerData {
  [key: string]: DataView;
}

export interface BluetoothAdvertisingEvent extends Event {
  readonly device: BluetoothDevice;
  readonly uuids: string[];
  readonly name: string;
  readonly rssi?: number;
  readonly txPower?: number;
  readonly manufacturerData: BluetoothManufacturerData;
  readonly serviceData: BluetoothServiceData;
}

export interface BluetoothLEScan {
  stop(): void;
}

export interface BluetoothRemoteGATTDescriptor {
  readonly characteristic: BluetoothRemoteGATTCharacteristic;
  readonly uuid: string;
  readonly value: DataView | null;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

export interface BluetoothCharacteristicProperties {
  readonly broadcast: boolean;
  readonly read: boolean;
  readonly writeWithoutResponse: boolean;
  readonly write: boolean;
  readonly notify: boolean;
  readonly indicate: boolean;
  readonly authenticatedSignedWrites: boolean;
  readonly reliableWrite: boolean;
  readonly writableAuxiliaries: boolean;
}

export interface BluetoothCharacteristicEventMap {
  'characteristicvaluechanged': Event;
}

export interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly service: BluetoothRemoteGATTService;
  readonly uuid: string;
  readonly value: DataView | null;
  readonly properties: BluetoothCharacteristicProperties;
  getDescriptor(descriptor: string): Promise<BluetoothRemoteGATTDescriptor>;
  getDescriptors(): Promise<BluetoothRemoteGATTDescriptor[]>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithResponse(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener<K extends keyof BluetoothCharacteristicEventMap>(
    type: K,
    listener: (this: BluetoothRemoteGATTCharacteristic, ev: BluetoothCharacteristicEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof BluetoothCharacteristicEventMap>(
    type: K,
    listener: (this: BluetoothRemoteGATTCharacteristic, ev: BluetoothCharacteristicEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

export interface BluetoothServiceEventMap {}

export interface BluetoothRemoteGATTService {
  readonly device: BluetoothDevice;
  readonly uuid: string;
  readonly isPrimary: boolean;
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  getIncludedService(service: string): Promise<BluetoothRemoteGATTService>;
  getIncludedServices(): Promise<BluetoothRemoteGATTService[]>;
}

export interface BluetoothRemoteGATTServer {
  readonly device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

export interface BluetoothDeviceEventMap {
  'gattserverdisconnected': Event;
  'advertisementreceived': BluetoothAdvertisingEvent;
  'characteristicvaluechanged': Event;
}

export interface BluetoothDevice extends EventTarget {
  readonly id: string;
  readonly name: string;
  readonly gatt?: BluetoothRemoteGATTServer;
  readonly watchingAdvertisements: boolean;
  watchAdvertisements(): Promise<void>;
  addEventListener<K extends keyof BluetoothDeviceEventMap>(
    type: K,
    listener: (this: BluetoothDevice, ev: BluetoothDeviceEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof BluetoothDeviceEventMap>(
    type: K,
    listener: (this: BluetoothDeviceEventMap[K], ev: BluetoothDeviceEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

export interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: string[];
  acceptAllDevices?: boolean;
}

export interface BluetoothRequestDeviceFilter {
  name?: string;
  namePrefix?: string;
  services?: string[];
  manufacturerData?: Array<{
    companyIdentifier: number;
    dataPrefix?: BufferSource;
    mask?: BufferSource;
  }>;
}

export interface Bluetooth {
  getAvailability(): Promise<boolean>;
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  getDevices?(): Promise<BluetoothDevice[]>;
}

declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
  interface Window {
    onrequestservice?: (e: Event) => void;
  }
}

export {};
