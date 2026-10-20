import { useState, useRef, useCallback } from 'react';
import {
  isWebBluetoothSupported,
  requestWatchDevice,
  readWatchData,
  matchProfile,
  WATCH_PROFILES,
  type WatchData,
  type DiscoveredService,
  type WatchProfile,
} from '@/lib/ble';
import type { BluetoothDevice, BluetoothRemoteGATTServer } from '@/types/web-bluetooth';
import {
  Bluetooth, BluetoothConnected, BluetoothOff,
  AlertCircle, Loader2, RefreshCw, Heart, Footprints,
  Flame, MapPin, Battery, Moon, Info, ExternalLink,
  Watch, ChevronDown, ChevronUp, Smartphone,
} from 'lucide-react';

type Status = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export function WatchView() {
  const supported = isWebBluetoothSupported();
  const [status, setStatus] = useState<Status>('disconnected');
  const [deviceName, setDeviceName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [watchData, setWatchData] = useState<WatchData | null>(null);
  const [discoveredServices, setDiscoveredServices] = useState<DiscoveredService[]>([]);
  const [hasSynced, setHasSynced] = useState(false);
  const [profile, setProfile] = useState<WatchProfile | null>(null);
  const [showServices, setShowServices] = useState(false);
  const [showBrandGuide, setShowBrandGuide] = useState(false);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);

  const handleDisconnect = useCallback(() => {
    setStatus('disconnected');
    setDeviceName('');
    setWatchData(null);
    setDiscoveredServices([]);
    setHasSynced(false);
    setSyncError('');
    setProfile(null);
    setShowServices(false);
    serverRef.current = null;
    deviceRef.current = null;
  }, []);

  async function connect() {
    if (!supported || !navigator.bluetooth) return;
    setStatus('scanning');
    setErrorMsg('');

    try {
      const device = await requestWatchDevice();
      deviceRef.current = device;
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      setStatus('connecting');
      const server = await device.gatt!.connect();
      serverRef.current = server;

      const matchedProfile = matchProfile(device.name || '');
      setProfile(matchedProfile);
      setDeviceName(device.name || 'Unknown Device');
      setStatus('connected');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setStatus('disconnected');
        setErrorMsg('No device selected. Try again and choose your smartwatch from the list.');
      } else {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to connect.');
      }
    }
  }

  function disconnect() {
    if (deviceRef.current && deviceRef.current.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    handleDisconnect();
  }

  async function syncData() {
    if (!serverRef.current || !profile) return;
    setSyncing(true);
    setSyncError('');
    try {
      const { data, services } = await readWatchData(serverRef.current, profile);
      setWatchData(data);
      setDiscoveredServices(services);
      setHasSynced(true);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to read data from watch.');
    }
    setSyncing(false);
  }

  // ── Unsupported browser ──
  if (!supported) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-100 mb-4">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="font-display text-xl font-bold text-slate-800 mb-2">
            Bluetooth Not Supported
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Your browser or device does not support Web Bluetooth, which is needed to connect to a smartwatch.
          </p>
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 text-left max-w-sm mx-auto">
            <p className="text-xs text-amber-700 font-semibold mb-2">To use this feature you need:</p>
            <ul className="text-xs text-amber-600 space-y-1">
              <li>A device with Bluetooth hardware (phone, tablet, or laptop)</li>
              <li>Google Chrome or Microsoft Edge (Chromium-based browser)</li>
              <li>Bluetooth turned on</li>
              <li>HTTPS connection (required by Web Bluetooth)</li>
            </ul>
            <p className="text-xs text-amber-500 mt-2">
              Safari and Firefox do not currently support Web Bluetooth. On iOS, a native app using CoreBluetooth is required.
            </p>
          </div>
        </div>

        <BrandCompatibilityGuide />
      </div>
    );
  }

  const isConnected = status === 'connected';
  const isBusy = status === 'scanning' || status === 'connecting';

  // Build list of data fields that have real values from the watch
  const dataFields: { label: string; icon: React.ElementType; value: string; color: string }[] = [];
  if (watchData) {
    if (watchData.heartRate !== null) {
      dataFields.push({ label: 'Heart Rate', icon: Heart, value: `${watchData.heartRate} bpm`, color: 'from-rose-400 to-red-500' });
    }
    if (watchData.steps !== null) {
      dataFields.push({ label: 'Steps', icon: Footprints, value: String(watchData.steps), color: 'from-blue-400 to-indigo-500' });
    }
    if (watchData.calories !== null) {
      dataFields.push({ label: 'Calories', icon: Flame, value: `${watchData.calories} kcal`, color: 'from-orange-400 to-amber-500' });
    }
    if (watchData.distance !== null) {
      dataFields.push({ label: 'Distance', icon: MapPin, value: `${watchData.distance} m`, color: 'from-teal-400 to-cyan-500' });
    }
    if (watchData.battery !== null) {
      dataFields.push({ label: 'Battery', icon: Battery, value: `${watchData.battery}%`, color: 'from-green-400 to-emerald-500' });
    }
    if (watchData.sleep) {
      dataFields.push({ label: 'Sleep', icon: Moon, value: `${watchData.sleep.hours}h ${watchData.sleep.minutes}m`, color: 'from-violet-400 to-purple-500' });
    }
  }

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`rounded-3xl p-6 flex items-center gap-4 transition-all ${
        isConnected
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300'
          : status === 'error'
          ? 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200'
          : 'glass border-2 border-slate-200'
      }`}>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shrink-0 ${
          isConnected ? 'bg-green-200'
          : status === 'error' ? 'bg-red-100'
          : 'bg-slate-100'
        }`}>
          {isConnected ? <BluetoothConnected className="w-8 h-8 text-green-600" />
          : isBusy ? <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          : status === 'error' ? <AlertCircle className="w-8 h-8 text-red-500" />
          : <BluetoothOff className="w-8 h-8 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg font-bold text-slate-800 truncate">
            {isConnected ? deviceName
            : status === 'connecting' ? 'Connecting...'
            : status === 'scanning' ? 'Scanning...'
            : status === 'error' ? 'Connection Error'
            : 'No Watch Connected'}
          </div>
          <div className="text-sm text-slate-500">
            {isConnected
              ? `${profile?.brand || 'Watch'} connected. Tap "Sync" to read real data.`
            : status === 'connecting' ? 'Establishing Bluetooth connection...'
            : status === 'scanning' ? 'Select your smartwatch from the browser dialog.'
            : status === 'error' ? errorMsg
            : 'Tap "Connect Watch" to scan for nearby Bluetooth smartwatches.'}
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${
          isConnected ? 'bg-green-200 text-green-700'
          : status === 'error' ? 'bg-red-100 text-red-600'
          : 'bg-slate-100 text-slate-500'
        }`}>
          {isConnected ? 'Connected' : status === 'connecting' ? 'Connecting' : status === 'scanning' ? 'Scanning' : status === 'error' ? 'Error' : 'Disconnected'}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {!isConnected && status !== 'error' && (
          <button
            onClick={connect}
            disabled={isBusy}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bluetooth className="w-5 h-5" />}
            {isBusy ? 'Searching...' : 'Connect Watch'}
          </button>
        )}
        {status === 'error' && (
          <button
            onClick={connect}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Bluetooth className="w-5 h-5" />
            Try Again
          </button>
        )}
        {isConnected && (
          <>
            <button
              onClick={syncData}
              disabled={syncing}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              {syncing ? 'Syncing...' : 'Sync Watch Data'}
            </button>
            <button
              onClick={disconnect}
              className="px-5 py-4 rounded-2xl bg-slate-200 text-slate-600 font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <BluetoothOff className="w-5 h-5" />
              Disconnect
            </button>
          </>
        )}
      </div>

      {/* Profile info — shows brand and limitations after connecting */}
      {isConnected && profile && (
        <div className={`rounded-2xl p-4 ${profile.requiresCompanionApp ? 'bg-amber-50 border-2 border-amber-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
          <div className="flex items-start gap-3">
            {profile.requiresCompanionApp ? (
              <Smartphone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <Watch className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold text-sm text-slate-800">
                {profile.brand}
              </div>
              <p className="text-xs text-slate-600 mt-1">{profile.description}</p>
              {profile.requiresCompanionApp && profile.companionAppNote && (
                <p className="text-xs text-amber-700 mt-2 font-medium">
                  {profile.companionAppNote}
                </p>
              )}
              {profile.docsUrl && (
                <a
                  href={profile.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-semibold mt-2"
                >
                  Brand documentation <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync error */}
      {syncError && (
        <div className="rounded-2xl p-4 bg-red-50 border-2 border-red-200 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 font-semibold">{syncError}</p>
        </div>
      )}

      {/* Synced data */}
      {hasSynced && (
        <div className="space-y-4 animate-slide-up">
          {dataFields.length > 0 ? (
            <>
              <h3 className="font-display text-lg font-bold text-slate-800">Watch Data</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {dataFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div
                      key={field.label}
                      className={`rounded-2xl p-4 text-center bg-gradient-to-br ${field.color} border-transparent shadow-md`}
                    >
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 mb-2">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="font-display text-2xl font-bold text-white">{field.value}</div>
                      <div className="text-xs font-semibold text-white/80">{field.label}</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="glass rounded-2xl p-4 text-center">
              <Info className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No standard health data characteristics were found on this watch.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                The watch may not expose steps, heart rate, or other health data through standard BLE services, or it may require a companion app to sync first. Check the discovered services below.
              </p>
            </div>
          )}

          {/* Discovered services — collapsible */}
          <div className="glass rounded-2xl p-4">
            <button
              onClick={() => setShowServices(!showServices)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Info className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-bold text-slate-600 flex-1">
                Discovered GATT Services ({discoveredServices.length})
              </h4>
              {showServices ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showServices && (
              <div className="mt-3 space-y-2">
                {discoveredServices.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">
                    No services discovered on this device.
                  </p>
                ) : (
                  discoveredServices.map((svc) => (
                    <div key={svc.uuid} className="rounded-xl bg-white/50 p-3 border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-sm font-bold text-slate-700">{svc.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mb-2 break-all">{svc.uuid}</div>
                      {svc.characteristics.length > 0 && (
                        <div className="space-y-1">
                          {svc.characteristics.map((ch) => (
                            <div key={ch.uuid} className="flex items-start gap-2 pl-4">
                              <div className="flex flex-wrap gap-1 shrink-0">
                                {ch.readable && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">R</span>}
                                {ch.writable && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">W</span>}
                                {ch.notifiable && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-600">N</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-slate-600">{ch.name}</div>
                                {ch.value && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Value: <span className="font-mono font-bold text-slate-700">{ch.value}</span>
                                  </div>
                                )}
                                <div className="text-[9px] text-slate-300 font-mono break-all">{ch.uuid}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scanning hint */}
      {status === 'scanning' && (
        <div className="glass rounded-2xl p-4 text-center">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            A browser dialog should appear. Select your <strong>smartwatch</strong> from the list.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Make sure your watch is turned on, Bluetooth is enabled, and the watch is nearby.
          </p>
        </div>
      )}

      {/* Brand compatibility guide */}
      <div className="glass rounded-2xl p-4">
        <button
          onClick={() => setShowBrandGuide(!showBrandGuide)}
          className="flex items-center gap-2 w-full text-left"
        >
          <Watch className="w-4 h-4 text-slate-400" />
          <h4 className="text-sm font-bold text-slate-600 flex-1">Supported Watch Brands</h4>
          {showBrandGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showBrandGuide && (
          <div className="mt-3 space-y-2">
            {WATCH_PROFILES.filter((p) => p.id !== 'generic').map((p) => (
              <div key={p.id} className="rounded-xl bg-white/50 p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-700">{p.brand}</span>
                  {p.requiresCompanionApp && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">Needs App</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{p.description}</p>
                {p.docsUrl && (
                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-semibold mt-1"
                  >
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
            <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
              <p className="text-xs text-blue-600 font-semibold">
                Generic BLE Watch
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Any Bluetooth device that exposes standard health services (Heart Rate, Battery) will work. Unknown brands fall back to generic mode automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandCompatibilityGuide() {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Watch className="w-4 h-4 text-slate-400" />
        <h4 className="text-sm font-bold text-slate-600">Supported Watch Brands</h4>
      </div>
      <div className="space-y-2">
        {WATCH_PROFILES.filter((p) => p.id !== 'generic').map((p) => (
          <div key={p.id} className="rounded-xl bg-white/50 p-3 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-slate-700">{p.brand}</span>
              {p.requiresCompanionApp && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">Needs App</span>
              )}
            </div>
            <p className="text-xs text-slate-500">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
