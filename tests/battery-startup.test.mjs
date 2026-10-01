import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { URL } from 'node:url';
import { setImmediate } from 'node:timers';
import mitt from 'mitt';
import ts from 'typescript';
import WebSocket from 'ws';

async function load(relativePath, imports) {
  const source = await fs.readFile(new URL('../' + relativePath, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  });
  const module = new vm.SourceTextModule(outputText);
  await module.link(specifier => {
    assert.ok(Object.hasOwn(imports, specifier), 'Unexpected dependency: ' + specifier);
    const exports = imports[specifier];
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}
const plain = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
const unit = await load('lib/unitConversion.ts', {});
const util = await load('lib/util.ts', { mitt: { default: mitt } });
const rpc = await load('lib/rpc/Rpc.ts', { '../config.js': { RPC_SRC: 'test' } });
const methods = await load('lib/component/components/Shelly/ListMethods.ts', { '../../../rpc/Rpc.js': rpc });
const DAY = 24 * 60 * 60 * 1000;
const HOUR = DAY / 24;
const DEVICE_ID = 'shellyfloodg4-TEST';
const DRIVER_ID = 'shellyfloodg4_local';

class Clock {
  now = 0;
  timers = new Map();
  setTimeout(callback, delay) {
    const handle = {};
    this.timers.set(handle, { due: this.now + delay, callback });
    return handle;
  }
  clearTimeout(handle) {
    this.timers.delete(handle);
  }
  async advance(duration) {
    const target = this.now + duration;
    for (;;) {
      const next = [...this.timers.entries()]
        .filter(([, timer]) => timer.due <= target)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [handle, timer] = next;
      this.now = timer.due;
      this.timers.delete(handle);
      timer.callback();
      await settle();
    }
    this.now = target;
    await settle();
  }
}

class SensorComponent {
  constructor(device, status, config) {
    this.device = device;
    this.status = status;
    this.config = config;
  }
  initialize() {}
  async unregisterHomeyDevice() {}
  async updateStatus(homeyDevice, status) {
    Object.assign(this.status, status);
    this.apply(homeyDevice);
  }
}
class Flood extends SensorComponent {
  apply(homeyDevice) {
    if (this.status.alarm !== undefined) homeyDevice.values.alarm_water = this.status.alarm;
  }
}
class Power extends SensorComponent {
  apply(homeyDevice) {
    homeyDevice.values.measure_battery = this.status.battery.percent;
  }
}
class NoPassword extends Error {}

const shelly = {
  GetComponents: (channel, params) => channel.sendRequestFrame(rpc.createRequestFrame('Shelly.GetComponents', params)),
  ListMethods: channel => channel.sendRequestFrame(rpc.createRequestFrame('Shelly.ListMethods')),
  Reboot: (channel, params) => channel.sendRequestFrame(rpc.createRequestFrame('Shelly.Reboot', params)),
};
function stream(app, kind) {
  const channel = {
    kind,
    wsState: WebSocket.CONNECTING,
    eventEmitter: mitt(),
    disconnect() {
      this.eventEmitter.all.clear();
    },
    resetReconnectTimeout() {},
    safeConnect() {},
  };
  app.channels.push(channel);
  return channel;
}
const virtualModule = await load('lib/VirtualDevice.ts', {
  ws: { default: WebSocket },
  './component/ComponentMapping.js': { ComponentMapping: { flood: Flood, devicepower: Power } },
  './component/components/Shelly.js': { default: shelly },
  './component/components/Shelly/ListMethods.js': methods,
  './HomeyRPCChannels.js': {
    createHttpChannel: app => ({
      useHttps: false,
      async sendRequestFrame(frame) {
        app.requests.push(plain(frame));
        if (app.failRpc) throw app.failRpc;
        if (frame.method === 'Shelly.GetComponents') {
          return { result: { components: plain(app.freshComponents), total: app.freshComponents.length } };
        }
        if (frame.method === 'Shelly.ListMethods') {
          return { result: { methods: ['Flood.GetStatus', 'DevicePower.GetStatus'] } };
        }
        return { result: null };
      },
    }),
    createInboundWsChannel: app => stream(app, 'inbound'),
    createOutboundWsChannel: app => stream(app, 'outbound'),
  },
  './util.js': util,
  './LocalIp.js': { getIp: async () => '192.0.2.175' },
  './config.js': { OUTBOUND_WS_PORT: 6114 },
  './component/components/OutboundWebsocket/SetConfig.js': {
    default: (channel, params) => channel.sendRequestFrame(rpc.createRequestFrame('Ws.SetConfig', params)),
  },
  './rpc/Authentication.js': { NoPassword },
  './unitConversion.js': unit,
});

async function restoredSensor(options = {}) {
  const clock = new Clock();
  const initialized = Promise.withResolvers();
  const ready = options.deferReady ? Promise.withResolvers() : { promise: Promise.resolve() };
  const device = {
    __id: 'homey-device-test',
    available: false,
    values: { alarm_water: true, measure_battery: 73 },
    virtualComponents: new Map(),
    initializationCount: 0,
    availabilityChanges: [],
    getTypedData: () => ({ id: DEVICE_ID }),
    ready: () => ready.promise,
    async setAvailable() {
      this.available = true;
      this.unavailableMessage = null;
      this.availabilityChanges.push(true);
    },
    async setUnavailable(message) {
      this.available = false;
      this.unavailableMessage = message;
      this.availabilityChanges.push(false);
    },
    async setSettings() {},
    error() {},
    async initializeShelly(virtual, keys, methodMapping) {
      this.initializationCount += 1;
      this.virtualDevice = virtual;
      this.registeredMethods = plain(methodMapping);
      for (const key of keys) {
        const component = virtual.virtualComponents.get(key);
        if (component) {
          this.virtualComponents.set(key, component);
          component.apply(this);
        }
      }
      await this.setAvailable();
    },
  };
  const driver = {
    configureOutboundWebsocket: true,
    getLocalDevice: id => (id === DEVICE_ID ? device : undefined),
    getDevices: () => [device],
    splitComponents: components => ({ mainComponents: components, addonComponents: [] }),
    async assembleHomeyDevices(selected, components) {
      return [
        {
          name: 'Flood Test',
          data: { id: selected.data.id },
          store: { address: '192.0.2.1', port: 80, components: components.map(component => component.key) },
        },
      ];
    },
  };
  const errors = [];
  const app = {
    localDriversReady: initialized.promise,
    outboundWsServer: { outboundWsMitt: mitt() },
    channels: [],
    requests: [],
    freshComponents: [
      { key: 'flood:0', status: { id: 0, alarm: false }, config: { id: 0 } },
      { key: 'devicepower:0', status: { id: 0, battery: { percent: 72 } }, config: {} },
      { key: 'ws', status: {}, config: { enable: true, server: 'wss://192.0.2.175:6114' } },
    ],
    log() {},
    debug() {},
    error(...args) {
      errors.push(args);
    },
    async updateVirtualDevice(virtual) {
      this.saved = plain(virtual.serialize());
    },
    async removeVirtualDevice() {},
    homey: {
      __: key => key,
      setTimeout: (callback, delay) => clock.setTimeout(callback, delay),
      clearTimeout: handle => clock.clearTimeout(handle),
      drivers: { getDrivers: () => ({ [DRIVER_ID]: driver }), getDriver: () => driver },
    },
  };
  const freshPairComponents = options.freshPair ? plain(app.freshComponents) : undefined;
  if (freshPairComponents) freshPairComponents.find(component => component.key === 'ws').config.enable = false;
  const definitions = options.freshPair
    ? [
        {
          name: 'Flood Test',
          data: { id: DEVICE_ID },
          store: { address: '192.0.2.1', port: 80, components: ['flood:0', 'devicepower:0', 'ws'] },
        },
      ]
    : undefined;
  const virtual = new virtualModule.VirtualDevice(
    app,
    DEVICE_ID,
    '192.0.2.1',
    options.battery !== false,
    ['flood:0', 'devicepower:0', 'ws'],
    DRIVER_ID,
    [DEVICE_ID],
    false,
    null,
    null,
    freshPairComponents,
    definitions,
  );
  initialized.resolve();
  await settle();
  const wake = async () => {
    const channel = app.channels.find(channel => channel.kind === 'outbound');
    channel.wsState = WebSocket.OPEN;
    channel.eventEmitter.emit('opened');
    await settle();
  };
  return { app, virtual, device, clock, wake, errors, ready };
}

test('a restored sleeping Flood keeps its last water alarm and battery reading available without HTTP polling', async () => {
  const sensor = await restoredSensor();
  assert.equal(sensor.device.available, true);
  assert.deepEqual(sensor.device.values, { alarm_water: true, measure_battery: 73 });
  assert.deepEqual(sensor.device.availabilityChanges, [true]);
  assert.equal(sensor.app.requests.length, 0);
  assert.equal(sensor.app.channels.filter(channel => channel.kind === 'inbound').length, 0);
  assert.equal(sensor.device.initializationCount, 0);
  assert.equal(sensor.clock.timers.size, 1);
  await sensor.clock.advance(DAY - 1);
  assert.equal(sensor.device.available, true);
  await sensor.clock.advance(1);
  assert.equal(sensor.device.available, false);
  assert.equal(sensor.device.unavailableMessage, 'device.offline');
  assert.deepEqual(sensor.device.values, { alarm_water: true, measure_battery: 73 });
});

test('wakeup before the deadline initializes fresh values and cancels the startup timeout', async () => {
  const sensor = await restoredSensor();
  await sensor.clock.advance(23 * HOUR);
  await sensor.wake();
  assert.equal(sensor.device.initializationCount, 1);
  assert.equal(sensor.device.available, true);
  assert.deepEqual(sensor.device.values, { alarm_water: false, measure_battery: 72 });
  assert.ok(sensor.device.registeredMethods.Flood.includes('GetStatus'));
  assert.equal(sensor.clock.timers.size, 0);
  await sensor.clock.advance(2 * HOUR);
  assert.equal(sensor.device.available, true);
  assert.equal(sensor.errors.length, 0);
});

test('a Flood that wakes after 24 hours still performs full initialization and receives future alarms', async () => {
  const sensor = await restoredSensor();
  await sensor.clock.advance(30 * HOUR);
  assert.equal(sensor.device.available, false);
  await sensor.wake();
  assert.equal(sensor.device.initializationCount, 1);
  assert.equal(sensor.device.available, true);
  assert.deepEqual(sensor.device.values, { alarm_water: false, measure_battery: 72 });
  const channel = sensor.app.channels.find(channel => channel.kind === 'outbound');
  channel.eventEmitter.emit('notification', { method: 'NotifyStatus', params: { 'flood:0': { id: 0, alarm: true } } });
  await settle();
  assert.equal(sensor.device.values.alarm_water, true);
  assert.equal(sensor.errors.length, 0);
});

test('normal sleep retains the existing 24-hour timeout and resets it after another wakeup', async () => {
  const sensor = await restoredSensor();
  await sensor.wake();
  await sensor.virtual.transition({ action: 'going_to_sleep' });
  await sensor.clock.advance(23 * HOUR);
  assert.equal(sensor.device.available, true);
  await sensor.wake();
  await sensor.virtual.transition({ action: 'going_to_sleep' });
  await sensor.clock.advance(HOUR);
  assert.equal(sensor.device.available, true);
  await sensor.clock.advance(23 * HOUR);
  assert.equal(sensor.device.available, false);
  await sensor.wake();
  assert.equal(sensor.device.available, true);
});

test('mains powered devices still remain unavailable until their first connection', async () => {
  const sensor = await restoredSensor({ battery: false });
  assert.equal(sensor.device.available, false);
  assert.equal(sensor.device.unavailableMessage, 'device.offline');
  assert.equal(sensor.clock.timers.size, 0);
  assert.ok(sensor.app.requests.some(frame => frame.method === 'Shelly.GetComponents'));
  assert.equal(sensor.app.channels.filter(channel => channel.kind === 'inbound').length, 1);
  await sensor.clock.advance(DAY);
  assert.equal(sensor.device.available, false);
});

test('newly paired battery sensors still configure outbound WebSocket before being made available', async () => {
  const sensor = await restoredSensor({ freshPair: true });
  assert.equal(sensor.device.available, false);
  assert.equal(sensor.clock.timers.size, 0);
  assert.ok(sensor.app.requests.some(frame => frame.method === 'Ws.SetConfig'));
  assert.ok(sensor.app.requests.some(frame => frame.method === 'Shelly.Reboot'));
  await sensor.wake();
  assert.equal(sensor.device.initializationCount, 1);
  assert.equal(sensor.device.available, true);
});

test('delayed Homey initialization cannot restore availability after the 24-hour deadline', async () => {
  const sensor = await restoredSensor({ deferReady: true });
  await sensor.clock.advance(DAY);
  assert.equal(sensor.device.available, false);
  sensor.ready.resolve();
  await settle();
  assert.equal(sensor.device.available, false);
  assert.equal(sensor.device.unavailableMessage, 'device.offline');
});

test('repair cancels the startup timer without leaving an old deadline that can mark the device offline', async () => {
  const sensor = await restoredSensor();
  await sensor.clock.advance(23 * HOUR);
  await sensor.virtual.recreate(
    [
      {
        name: 'Flood Test',
        data: { id: DEVICE_ID },
        store: { address: '192.0.2.1', port: 80, components: ['flood:0', 'devicepower:0', 'ws'] },
      },
    ],
    plain(sensor.app.freshComponents),
  );
  assert.equal(sensor.device.initializationCount, 1);
  assert.equal(sensor.device.available, true);
  assert.equal(sensor.clock.timers.size, 0);
  await sensor.clock.advance(2 * HOUR);
  assert.equal(sensor.device.available, true);
});
