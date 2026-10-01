import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { URL } from 'node:url';
import ts from 'typescript';

// Homey's runtime classes are supplied by the hub. Load the real driver and
// device code with a small host stub so channel routing can be checked locally.
async function loadSource(relativePath, imports) {
  const source = await fs.readFile(new URL('../' + relativePath, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  });
  const module = new vm.SourceTextModule(outputText);
  await module.link(specifier => {
    assert.ok(Object.hasOwn(imports, specifier), 'Unexpected runtime dependency: ' + specifier);
    return new vm.SyntheticModule(['default'], function () {
      this.setExport('default', imports[specifier]);
    });
  });
  await module.evaluate();
  return module.namespace.default;
}

class LocalDriver {
  get baseDriverId() {
    return this.id.split('_')[0];
  }
}
class LocalDevice {
  virtualComponents = new Map();
  events = [];
  writtenSettings = [];
  async onSettings(event) {
    this.events.push(event);
  }
  async setSettings(settings) {
    this.writtenSettings.push(settings);
  }
  async setComponentSettings(_component, _id, settings) {
    return this.setSettings(settings);
  }
}
const plain = value => JSON.parse(JSON.stringify(value));
const MultiLightDriver = await loadSource('lib/local/ShellyMultiLightInputLocalDriver.ts', {
  '../component/components/Light.js': class {
    static uiName = 'Light';
  },
  './LocalDriver.js': LocalDriver,
});
const MultiInputDevice = await loadSource('lib/local/ShellyMultiInputLocalDevice.ts', {
  './LocalDevice.js': LocalDevice,
});
const MultiLightDevice = await loadSource('lib/local/ShellyMultiLightInputLocalDevice.ts', {
  './ShellyMultiInputLocalDevice.js': MultiInputDevice,
});
const fixture = JSON.parse(
  await fs.readFile(new URL('../interviews/shellyprodm2pm/rpc.json', import.meta.url), 'utf8'),
);
const components = [...fixture, { key: 'sys', config: {}, status: {} }, { key: 'cloud', config: {}, status: {} }];
function selectedDevice(channels = 2) {
  return {
    name: 'Pro Dimmer',
    data: { id: 'shellyprodm' + channels + 'pm-test', useHttps: false },
    store: { address: '192.0.2.1', port: 80, components: [] },
  };
}
async function driverFor(channels) {
  const Driver = await loadSource('drivers/shellyprodm' + channels + 'pm_local/driver.ts', {
    '../../lib/local/ShellyMultiLightInputLocalDriver.js': MultiLightDriver,
  });
  const driver = new Driver();
  driver.id = 'shellyprodm' + channels + 'pm_local';
  return driver;
}
async function deviceFor(inputIds) {
  const Device = await loadSource('drivers/shellyprodm2pm_local/device.ts', {
    '../../lib/local/ShellyMultiLightInputLocalDevice.js': MultiLightDevice,
  });
  const device = new Device();
  const inputEvents = [];
  for (const id of [...inputIds].reverse()) {
    device.virtualComponents.set('input:' + id, {
      async handleSettings(_device, event) {
        inputEvents.push({ id, event: plain(event) });
      },
    });
  }
  device.virtualComponents.set('light:' + inputIds[0] / 2, {});
  return { device, inputEvents };
}

test('2 PM exposes two independent lights with only their own inputs', async () => {
  const driver = await driverFor(2);
  const devices = plain(await driver.assembleHomeyDevices(selectedDevice(), components));
  assert.equal(devices.length, 2);
  assert.deepEqual(
    devices.map(device => device.data.id),
    ['shellyprodm2pm-test:light:0', 'shellyprodm2pm-test:light:1'],
  );
  assert.deepEqual(devices[0].store.components, ['light:0', 'input:0', 'input:1', 'sys', 'cloud']);
  assert.deepEqual(devices[1].store.components, ['light:1', 'input:2', 'input:3', 'sys', 'cloud']);
  assert.ok(devices.every(device => device.data.parent === selectedDevice().data.id));
  assert.deepEqual(
    devices.map(device => device.name),
    ['Pro Dimmer - Light 1', 'Pro Dimmer - Light 2'],
  );
});

test('1 PM exposes its light and both inputs', async () => {
  const driver = await driverFor(1);
  const oneChannel = components.filter(component => !['light:1', 'input:2', 'input:3'].includes(component.key));
  const devices = plain(await driver.assembleHomeyDevices(selectedDevice(1), oneChannel));
  assert.equal(devices.length, 1);
  assert.equal(devices[0].data.id, 'shellyprodm1pm-test:light:0');
  assert.deepEqual(devices[0].store.components, ['light:0', 'input:0', 'input:1', 'sys', 'cloud']);
});

test('an unused, uncalibrated second channel remains available', async () => {
  const fixtureChannel = fixture.find(component => component.key === 'light:1');
  assert.ok(fixtureChannel.status.flags.includes('uncalibrated'));
  const driver = await driverFor(2);
  const devices = await driver.assembleHomeyDevices(selectedDevice(), components);
  assert.ok(devices.some(device => device.store.components.includes('light:1')));
});

test('channel names and advertised input associations take precedence', async () => {
  const custom = plain(components);
  const light = custom.find(component => component.key === 'light:0');
  light.config.name = 'Outside';
  light.attrs.inputs = [2, 3];
  const driver = await driverFor(2);
  const devices = plain(await driver.assembleHomeyDevices(selectedDevice(), custom));
  assert.equal(devices[0].name, 'Pro Dimmer - Outside');
  assert.deepEqual(devices[0].store.components, ['light:0', 'input:2', 'input:3', 'sys', 'cloud']);
});

test('older firmware without input attributes uses the documented input pairs', async () => {
  const older = plain(components);
  for (const component of older) {
    delete component.attrs;
  }
  const driver = await driverFor(2);
  const devices = plain(await driver.assembleHomeyDevices(selectedDevice(), older));
  assert.deepEqual(devices[1].store.components, ['light:1', 'input:2', 'input:3', 'sys', 'cloud']);
  const missingInput = older.filter(component => component.key !== 'input:3');
  const devicesWithMissingInput = await driver.assembleHomeyDevices(selectedDevice(), missingInput);
  assert.ok(!devicesWithMissingInput[1].store.components.includes('input:3'));
});

test('second channel configuration is displayed as the two inputs of that channel', async () => {
  const { device } = await deviceFor([2, 3]);
  await device.setComponentSettings('Input', 2, { 'Input:enable': true, 'Input:invert': false });
  await device.setComponentSettings('Input', 3, { 'Input:enable': false });
  await device.setComponentSettings('Light', 1, { 'Light:power_limit': 230 });
  assert.deepEqual(plain(device.writtenSettings), [
    { 'Input:0:enable': true, 'Input:0:invert': false },
    { 'Input:1:enable': false },
    { 'Light:power_limit': 230 },
  ]);
});

test('second channel input settings reach inputs 2 and 3, with light settings kept separate', async () => {
  const { device, inputEvents } = await deviceFor([2, 3]);
  await device.onSettings({
    changedKeys: ['Input:0:enable', 'Input:1:invert', 'Light:in_mode'],
    oldSettings: { 'Input:0:enable': true, 'Input:1:invert': false, 'Light:in_mode': 'dim' },
    newSettings: { 'Input:0:enable': false, 'Input:1:invert': true, 'Light:in_mode': 'dual_dim' },
  });
  assert.deepEqual(inputEvents, [
    {
      id: 2,
      event: {
        changedKeys: ['Input:enable'],
        oldSettings: { 'Input:enable': true },
        newSettings: { 'Input:enable': false },
      },
    },
    {
      id: 3,
      event: {
        changedKeys: ['Input:invert'],
        oldSettings: { 'Input:invert': false },
        newSettings: { 'Input:invert': true },
      },
    },
  ]);
  assert.deepEqual(plain(device.events), [
    {
      changedKeys: ['Light:in_mode'],
      oldSettings: { 'Light:in_mode': 'dim' },
      newSettings: { 'Light:in_mode': 'dual_dim' },
    },
  ]);
});

test('first channel input settings still reach inputs 0 and 1', async () => {
  const { device, inputEvents } = await deviceFor([0, 1]);
  await device.onSettings({
    changedKeys: ['Input:0:invert'],
    oldSettings: { 'Input:0:invert': false, 'Input:1:enable': true },
    newSettings: { 'Input:0:invert': true, 'Input:1:enable': true },
  });
  assert.equal(inputEvents[0].id, 0);
  assert.deepEqual(inputEvents[0].event.changedKeys, ['Input:invert']);
  assert.deepEqual(inputEvents[1].event.changedKeys, []);
});
