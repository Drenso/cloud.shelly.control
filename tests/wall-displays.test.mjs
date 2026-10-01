import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { isIPv4 } from 'node:net';
import { test } from 'node:test';
import vm from 'node:vm';
import { URL } from 'node:url';
import mitt from 'mitt';
import ts from 'typescript';

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
      for (const [name, value] of Object.entries(exports)) {
        this.setExport(name, value);
      }
    });
  });
  await module.evaluate();
  return module.namespace;
}
const plain = value => JSON.parse(JSON.stringify(value));
const util = await load('lib/util.ts', { mitt: { default: mitt } });
const rpc = await load('lib/rpc/Rpc.ts', { '../config.js': { RPC_SRC: 'test' } });
const safe = await load('lib/safeFunctions.ts', { './env.js': { isDebug: async () => false } });
const base = await load('lib/component/Component.ts', {
  '../safeFunctions.js': safe,
  '../util.js': util,
});
const methods = await load('lib/component/components/Shelly/ListMethods.ts', { '../../../rpc/Rpc.js': rpc });

class HostDriver {
  async onPair() {}
}
let info;
const calls = [];
const channel = {
  useHttps: false,
  async sendRequestFrame(frame) {
    calls.push(plain(frame));
    if (frame.method === 'Shelly.GetDeviceInfo') return { result: info };
    if (frame.method === 'Sys.GetConfig') return { result: { device: { name: 'Wall Display Test' } } };
    return { result: {} };
  },
};
let channelForAddress = () => channel;
const shelly = {
  GetDeviceInfo: channel => channel.sendRequestFrame(rpc.createRequestFrame('Shelly.GetDeviceInfo')),
  GetStatus: channel => channel.sendRequestFrame(rpc.createRequestFrame('Shelly.GetStatus')),
};
class PairHandler {
  async setup() {}
}
const driverBase = await load('lib/local/LocalDriver.ts', {
  homey: { default: { Driver: HostDriver, env: {} } },
  '../VirtualDevice.js': { VirtualDevice: class {} },
  '../component/components/Shelly.js': { default: shelly },
  '../HomeyRPCChannels.js': { createHttpChannel: (_app, address) => channelForAddress(address) },
  './LocalPairingHandler.js': { LocalPairingHandler: PairHandler },
  './LocalRePairingHandler.js': { LocalRePairingHandler: PairHandler },
});
const wallDriver = await load('lib/local/ShellyWallDisplayLocalDriver.ts', {
  'node:net': { isIPv4 },
  '../component/components/Shelly.js': { default: shelly },
  '../HomeyRPCChannels.js': { createHttpChannel: (_app, address) => channelForAddress(address) },
  '../rpc/Rpc.js': rpc,
  './LocalDriver.js': driverBase,
  './LocalRePairingHandler.js': { LocalRePairingHandler: PairHandler },
});
async function driverFor(x2i) {
  const id = x2i ? 'shellywalldisplayx2i' : 'shellywalldisplay';
  const { default: Driver } = await load('drivers/' + id + '_local/driver.ts', {
    '../../lib/local/ShellyWallDisplayLocalDriver.js': wallDriver,
  });
  const driver = new Driver();
  driver.id = id + '_local';
  driver.homey = {
    app: { virtualDevices: new Map() },
    __: key => key,
  };
  return driver;
}
const fixtures = await Promise.all(
  ['shellywalldisplay', 'shellywalldisplayx2i'].map(async id =>
    JSON.parse(await fs.readFile(new URL('../interviews/' + id + '/rpc.json', import.meta.url), 'utf8')),
  ),
);
const selected = {
  name: 'Wall Display',
  data: { id: 'ShellyWallDisplay-TEST', useHttps: false },
  store: { address: '192.0.2.1', port: 80, components: [] },
};

function hostDevice() {
  return {
    componentCounts: new Map([['Occupancy', 1]]),
    listeners: {},
    values: {},
    settings: {},
    options: {},
    homey: { flow: { getDeviceTriggerCard: () => ({ trigger: async () => {} }) } },
    hasCapability() {
      return true;
    },
    error() {},
    registerCapabilityListener(id, listener) {
      this.listeners[id] = listener;
    },
    async setCapabilityValue(id, value) {
      this.values[id] = value;
    },
    async setCapabilityOptions(id, options) {
      this.options[id] = options;
    },
    async setComponentSettings(_namespace, _id, settings) {
      Object.assign(this.settings, settings);
    },
  };
}
async function componentFor(name, fixture) {
  const deps = { '../Component.js': base, '../../rpc/Rpc.js': rpc };
  if (name === 'Media') deps['../../safeFunctions.js'] = safe;
  const { default: Class } = await load('lib/component/components/' + name + '.ts', deps);
  const key = name === 'WallDisplayUI' ? 'ui' : name.toLowerCase();
  const data = plain(fixture.find(component => component.key === key || component.key === key + ':0'));
  const frames = [];
  let response = {};
  const componentChannel = {
    async sendRequestFrame(frame) {
      frames.push(plain(frame));
      return { result: response };
    },
  };
  const component = new Class({ getChannel: () => componentChannel }, data.status, data.config);
  return {
    component,
    frames,
    respond: result => {
      response = result;
    },
  };
}

test('the two drivers match by model despite identical device ID prefixes', async () => {
  const old = await driverFor(false);
  const modern = await driverFor(true);
  const info = { id: 'ShellyWallDisplay-TEST', model: 'SAWD-0A1XX10EU1' };
  assert.equal(old.onPairMatchDevice(info), true);
  assert.equal(modern.onPairMatchDevice(info), false);
  assert.equal(modern.onPairMatchDevice({ ...info, model: 'SAWD-5A1XX10EU0' }), true);
  assert.equal(old.configureOutboundWebsocket, false);
  assert.equal(modern.configureOutboundWebsocket, false);
});

test('IP pairing preserves device identity and reads its configured name', async () => {
  const driver = await driverFor(false);
  info = { id: selected.data.id, model: 'SAWD-0A1XX10EU1', auth_en: false };
  calls.length = 0;
  const device = await driver.getDeviceAtAddress(' 192.0.2.1 ');
  assert.equal(device.data.id, selected.data.id);
  assert.equal(device.name, 'Wall Display Test');
  assert.equal(device.store.address, '192.0.2.1');
  assert.deepEqual(
    calls.map(frame => frame.method),
    ['Shelly.GetDeviceInfo', 'Sys.GetConfig'],
  );
});

test('IP pairing rejects the other model and duplicate devices', async () => {
  const driver = await driverFor(true);
  info = { id: selected.data.id, model: 'SAWD-0A1XX10EU1', auth_en: false };
  await assert.rejects(driver.getDeviceAtAddress('192.0.2.1'), /wrong_model/);
  info.model = 'SAWD-5A1XX10EU0';
  driver.app.virtualDevices.set(info.id, {});
  await assert.rejects(driver.getDeviceAtAddress('192.0.2.1'), /already_paired/);
  await assert.rejects(driver.getDeviceAtAddress('192.0.2.999'), /invalid_address/);
});

test('password protected screens use their device ID as authentication realm', async () => {
  const driver = await driverFor(false);
  info = { id: selected.data.id, model: 'SAWD-0A1XX10EU1', auth_en: true };
  calls.length = 0;
  const device = await driver.getDeviceAtAddress('192.0.2.1');
  assert.equal(device.store.auth_domain, info.id);
  assert.deepEqual(
    calls.map(frame => frame.method),
    ['Shelly.GetDeviceInfo'],
  );
});

test('legacy display keeps its sensors and modern display excludes unavailable built-ins', async () => {
  const legacy = (await (await driverFor(false)).assembleHomeyDevices(selected, fixtures[0]))[0];
  const modern = (await (await driverFor(true)).assembleHomeyDevices(selected, fixtures[1]))[0];
  assert.ok(legacy.store.components.includes('temperature:0'));
  assert.ok(legacy.store.components.includes('humidity:0'));
  assert.ok(!modern.store.components.includes('temperature:0'));
  assert.ok(!modern.store.components.includes('humidity:0'));
  assert.ok(modern.store.components.includes('occupancy:0'));
  assert.ok(modern.store.components.includes('switch:0'));
  assert.ok(modern.store.components.includes('illuminance:0'));
});

test('the interchangeable two-relay base retains both relays', async () => {
  const components = [...fixtures[1], { key: 'switch:1', status: { id: 1, output: false }, config: { id: 1 } }];
  const devices = await (await driverFor(true)).assembleHomeyDevices(selected, components);
  assert.equal(devices.length, 1);
  assert.ok(devices[0].store.components.includes('switch:0'));
  assert.ok(devices[0].store.components.includes('switch:1'));
});

test('nested RPC methods remain intact for screen and media registration', () => {
  const result = methods.parseMethodMapping([
    'Switch.Set',
    'Ui.Screen.Set',
    'Media.MediaPlayer.Play',
    'Media.Radio.ListFavourites',
  ]);
  assert.deepEqual(plain(result), {
    Switch: ['Set'],
    Ui: ['Screen.Set'],
    Media: ['MediaPlayer.Play', 'Radio.ListFavourites'],
  });
});

test('screen commands use Ui and preserve relay and automatic-off settings', async () => {
  const { component, frames } = await componentFor('WallDisplayUI', fixtures[1]);
  const autoOff = plain(component.config.brightness.auto_off);
  await component.setScreen(true);
  await component.setScreen(false);
  await component.setBrightness(50);
  assert.deepEqual(
    frames.map(({ method, params }) => ({ method, params })),
    [
      { method: 'Ui.Screen.Set', params: { on: true } },
      { method: 'Ui.Screen.Set', params: { on: false } },
      { method: 'Ui.SetConfig', params: { config: { brightness: { auto: false, level: 50 } } } },
    ],
  );
  assert.deepEqual(plain(component.config.brightness.auto_off), autoOff);
  await assert.rejects(component.setBrightness(101));
  await assert.rejects(component.setBrightness(NaN));
});

test('screen power is offered as commands, without inventing a readback state', async () => {
  const { component } = await componentFor('WallDisplayUI', fixtures[0]);
  const host = hostDevice();
  const capabilities = await component.registerHomeyDevice(host, ['Screen.Set']);
  assert.deepEqual(plain(capabilities), ['button.screen_on', 'button.screen_off']);
  assert.equal(Object.hasOwn(host.listeners, 'onoff'), false);
});

test('volume scales 0..10 to Homey 0..1 and never writes the relay', async () => {
  const { component, frames } = await componentFor('Media', fixtures[1]);
  const host = hostDevice();
  await component.setVolume(0.5);
  await component.onStatusUpdate(host, { playback: { enable: false, volume: 7 } });
  assert.equal(host.values.volume_set, 0.7);
  assert.equal(host.values.speaker_playing, false);
  assert.equal(Object.hasOwn(host.values, 'onoff'), false);
  assert.equal(frames[0].method, 'Media.SetVolume');
  assert.deepEqual(frames[0].params, { volume: 5 });
  await assert.rejects(component.setVolume(2));
});

test('sound library filters images and routes ring tones, alerts, audio and radio', async () => {
  const { component, frames, respond } = await componentFor('Media', fixtures[0]);
  respond({
    list: [
      { id: 1, type: 'RINGTONE', valid: true },
      { id: 2, type: 'AUDIO', valid: true },
      { id: 3, type: 'PHOTO', valid: true },
      { id: 4, type: 'ALERT', valid: false },
    ],
  });
  assert.deepEqual(
    plain(await component.listItems(false)).map(item => item.id),
    [1, 2],
  );
  await component.playItem({ id: 1, type: 'RINGTONE' }, false);
  await component.playItem({ id: 2, type: 'ALERT' }, false);
  await component.playItem({ id: 3, type: 'AUDIO' }, false);
  await component.playItem({ id: 4 }, true);
  assert.deepEqual(
    frames.slice(1).map(({ method, params }) => ({ method, params })),
    [
      { method: 'Media.MediaPlayer.PlayRingtone', params: { id: 1 } },
      { method: 'Media.MediaPlayer.PlayAlert', params: { id: 2 } },
      { method: 'Media.MediaPlayer.Play', params: { id: 3 } },
      { method: 'Media.Radio.PlayFavourite', params: { id: 4 } },
    ],
  );
});

test('radio stop and navigation use radio methods', async () => {
  const { component, frames } = await componentFor('Media', fixtures[1]);
  component.status.playback.media_type = 'RADIO';
  await component.control('stop');
  await component.control('next');
  await component.control('previous');
  assert.deepEqual(
    frames.map(frame => frame.method),
    ['Media.Radio.Stop', 'Media.Radio.PlayNextFavourite', 'Media.Radio.PlayPreviousFavourite'],
  );
});

test('proximity status is exposed independently of the relay', async () => {
  const { component, frames } = await componentFor('Occupancy', fixtures[1]);
  const host = hostDevice();
  await component.onStatusUpdate(host, { value: true });
  assert.equal(host.values.alarm_presence, true);
  await component.handleSettings(host, {
    changedKeys: ['Occupancy:wake_screen'],
    newSettings: { 'Occupancy:wake_screen': false },
  });
  assert.equal(frames[0].method, 'Occupancy.SetConfig');
  assert.deepEqual(frames[0].params, { id: 0, config: { wake_screen: false } });
});

test('status polling skips unchanged readings and updates changed measurements', async () => {
  class LocalDevice {
    virtualComponents = new Map();
    getAvailable() {
      return true;
    }
  }
  const { default: Device } = await load('lib/local/ShellyWallDisplayLocalDevice.ts', {
    '../component/components/Shelly.js': { default: shelly },
    './LocalDevice.js': { default: LocalDevice },
  });
  const device = new Device();
  const updates = [];
  device.virtualDevice = {
    getChannel: () => ({
      async sendRequestFrame() {
        return { result: { 'input:0': { id: 0, state: false }, 'illuminance:0': { id: 0, lux: 20 } } };
      },
    }),
  };
  device.virtualComponents.set('input:0', {
    status: { id: 0, state: false },
    updateStatus: async (_device, status) => updates.push(status),
  });
  device.virtualComponents.set('illuminance:0', {
    status: { id: 0, lux: 5 },
    updateStatus: async (_device, status) => updates.push(status),
  });
  await device.pollStatus();
  assert.deepEqual(plain(updates), [{ id: 0, lux: 20 }]);
});

test('a disabled Wall Display input initializes without switch controls or events', async () => {
  const options = JSON.parse(
    await fs.readFile(new URL('../lib/component/components/Input/capabilitiesOptions.json', import.meta.url), 'utf8'),
  );
  const deps = {
    '../../safeFunctions.js': safe,
    '../Component.js': base,
    '../../util.js': util,
    './Input/capabilitiesOptions.json': { default: options },
  };
  for (const method of ['SetConfig', 'GetConfig', 'GetStatus', 'CheckExpression', 'ResetCounters', 'Trigger']) {
    deps['./Input/' + method + '.js'] = { default: async () => ({ result: {} }) };
  }
  const { default: Input } = await load('lib/component/components/Input.ts', deps);
  const input = new Input({}, { id: 0, state: false }, { id: 0, type: 'disabled', name: null });
  const host = hostDevice();
  let triggers = 0;
  host.homey.flow.getDeviceTriggerCard = () => ({
    trigger: async () => {
      triggers++;
    },
  });
  host.virtualDevice = { virtualComponents: new Map([['input:0', input]]) };
  host.getTypedStore = () => ({ components: ['input:0'] });
  host.updateErrors = async () => {};
  const capabilities = await input.registerHomeyDevice(host, []);
  await input.onStatusUpdate(host, { id: 0, state: false });
  assert.ok(!capabilities.includes('hidden.has_input_switch'));
  assert.ok(!capabilities.includes('shelly_input_switch.0'));
  assert.equal(triggers, 0);
  assert.deepEqual(plain(Input.getInputTypes(host.virtualDevice)), { switch: [], button: [], analog: [], count: [] });
});

test('repair can select a hidden display directly without network discovery', async () => {
  const { LocalRePairingHandler: Handler } = await load('lib/local/LocalRePairingHandler.ts', {
    '../HomeyRPCChannels.js': { createHttpChannel: (_app, address) => channelForAddress(address) },
    '../component/components/Shelly.js': { default: shelly },
    '../rpc/channel/HttpChannel.js': { HttpError: class extends Error {} },
    '../rpc/Authentication.js': { NoPassword: class extends Error {} },
  });
  const repair = new Handler(
    {},
    {},
    {},
    () => {},
    () => {},
    () => {},
    async () => selected,
  );
  await repair.selectDevice();
  assert.equal(repair.selectedDevice.data.id, selected.data.id);
  assert.equal(repair.selectedDevice.store.address, '192.0.2.1');
});

test('media controls register valid Homey capabilities for previous and stop', async () => {
  const { component, frames, respond } = await componentFor('Media', fixtures[0]);
  const host = hostDevice();
  const capabilities = await component.registerHomeyDevice(host, ['MediaPlayer.Previous', 'MediaPlayer.Stop']);
  assert.deepEqual(plain(capabilities), ['speaker_prev', 'speaker_stop']);
  respond({ playback: { enable: false, volume: 5 } });
  await host.listeners.speaker_prev(true);
  await host.listeners.speaker_stop(true);
  assert.equal(frames[0].method, 'Media.MediaPlayer.Previous');
  assert.equal(frames[1].method, 'Media.MediaPlayer.Stop');
  await assert.rejects(component.control('invalid'), /Unknown playback action/);
});

test('HTTP RPC requests identify their payload as JSON for both display firmwares', async () => {
  let request;
  class Agent {
    async request(options) {
      request = options;
      return { statusCode: 200, body: { json: async () => ({ id: 1, result: { model: 'SAWD-0A1XX10EU1' } }) } };
    }
  }
  const { default: HttpChannel } = await load('lib/rpc/channel/HttpChannel.ts', {
    '../Rpc.js': rpc,
    '../RpcError.js': { RpcError: class extends Error {} },
    '../Authentication.js': { NoPassword: class extends Error {}, createAuthenticationResponse: () => ({}) },
    undici: { Agent },
  });
  const channel = new HttpChannel(
    '192.0.2.1',
    () => {},
    key => key,
    false,
    null,
  );
  const frame = rpc.createRequestFrame('Shelly.GetDeviceInfo');
  const result = await channel.sendRequestFrame(frame);
  assert.equal(request.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(request.body), plain(frame));
  assert.equal(result.result.model, 'SAWD-0A1XX10EU1');
});

test('automatic discovery finds names and auth realms, and excludes other models, paired, duplicate and offline devices', async () => {
  const driver = await driverFor(false);
  const deviceInfos = {
    '192.0.2.1': { id: 'ShellyWallDisplay-FRONT', model: 'SAWD-0A1XX10EU1', auth_en: false },
    '192.0.2.2': { id: 'ShellyWallDisplay-PROTECTED', model: 'SAWD-0A1XX10EU1', auth_en: true },
    '192.0.2.3': { id: 'ShellyWallDisplay-X2I', model: 'SAWD-5A1XX10EU0', auth_en: false },
    '192.0.2.4': { id: 'ShellyWallDisplay-PAIRED', model: 'SAWD-0A1XX10EU1', auth_en: false },
  };
  deviceInfos['192.0.2.5'] = deviceInfos['192.0.2.1'];
  driver.app.virtualDevices.set('ShellyWallDisplay-PAIRED', {});
  const addresses = [...Object.keys(deviceInfos), '192.0.2.6', '192.0.2.1'];
  driver.homey.discovery = {
    getStrategy: id => {
      assert.equal(id, 'shelly');
      return {
        getDiscoveryResults: () =>
          Object.fromEntries(
            addresses.map((address, index) => [index, { address, port: 80, txt: { discoverable: 'false' } }]),
          ),
      };
    },
  };
  const infoRequests = [];
  channelForAddress = address => ({
    useHttps: false,
    async sendRequestFrame(frame) {
      if (frame.method === 'Shelly.GetDeviceInfo') {
        infoRequests.push(address);
        if (!deviceInfos[address]) throw new Error('Offline');
        return { result: deviceInfos[address] };
      }
      if (frame.method === 'Sys.GetConfig') return { result: { device: { name: 'Front Display' } } };
      throw new Error('Unexpected method: ' + frame.method);
    },
  });
  try {
    const devices = await driver.onPairListDevices();
    assert.equal(devices.length, 2);
    assert.equal(devices.find(device => device.data.id === 'ShellyWallDisplay-FRONT').name, 'Front Display');
    assert.equal(
      devices.find(device => device.data.id === 'ShellyWallDisplay-PROTECTED').store.auth_domain,
      'ShellyWallDisplay-PROTECTED',
    );
    assert.equal(infoRequests.filter(address => address === '192.0.2.1').length, 1);
    driver.homey.discovery.getStrategy = () => ({ getDiscoveryResults: () => ({}) });
    assert.deepEqual(plain(await driver.onPairListDevices()), []);
  } finally {
    channelForAddress = () => channel;
  }
});
