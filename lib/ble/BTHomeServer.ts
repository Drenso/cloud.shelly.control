import { createMitt } from '../util.js';
import type { VirtualDevice } from '../VirtualDevice.js';
import { readFile } from 'node:fs/promises';
import Script from '../component/components/Script.js';
import PutCode from '../component/components/Script/PutCode.js';
import type { BleForwardEventData } from './BTHome.js';
import SetConfig from '../component/components/Script/SetConfig.js';
import Start from '../component/components/Script/Start.js';
import Homey from 'homey';
import Delete from '../component/components/Script/Delete.js';
import path from 'node:path';
import { inspect } from 'node:util';
import Eval from '../component/components/Script/Eval.js';
import Stop from '../component/components/Script/Stop.js';

const SCRIPT_NAME = 'Homey BLE forwarding';
const SCRIPT_VERSION = 1;

type BTHomeMitt = Record<string, BleForwardEventData>;

export class BTHomeServer {
  public readonly btHomeMitt = createMitt<BTHomeMitt>();

  public constructor(
    public readonly log: (...args: unknown[]) => void,
    public readonly error: (...args: unknown[]) => void,
  ) {}

  public async updateForwardingScript(device: VirtualDevice): Promise<void> {
    const scriptId = device.bleForwardScriptId;

    if (scriptId === null) {
      device.debug(`No BLE forwarding script to update on ${device.deviceId}`);
      return;
    }

    const response = await Eval(device.getChannel(), scriptId, { code: 'homey_ble_forward_script_version()' });
    const installedVersion = parseInt(response.result.result);
    if (installedVersion < SCRIPT_VERSION) {
      device.log('Updating BLE script', scriptId, 'from', installedVersion, 'to', SCRIPT_VERSION);
      await Stop(device.getChannel(), scriptId);
      await this.installForwardingScript(device, scriptId);
    }
  }

  public async createForwardingScript(device: VirtualDevice): Promise<void> {
    const createResponse = await Script.Create(device.getChannel(), { name: SCRIPT_NAME });
    const scriptId = createResponse.result.id;
    await this.installForwardingScript(device, scriptId);
    device.bleForwardScriptId = scriptId;
    await device.app.updateVirtualDevice(device);
  }

  private async installForwardingScript(device: VirtualDevice, scriptId: number): Promise<void> {
    const scriptPath = path.join(import.meta.dirname, 'script.js');
    const script = await readFile(scriptPath, 'utf8');
    device.log('Installing BLE forwarding in script:', scriptId);
    await PutCode(device.getChannel(), scriptId, { code: script });
    this.debug(`Installed BLE forwarding on ${device.deviceId}, configuring...`);
    await SetConfig(device.getChannel(), scriptId, { config: { enable: true } });
    await Start(device.getChannel(), scriptId);
    this.debug(`BLE forwarding enabled on ${device.deviceId}`);
  }

  public async uninstallForwardingScript(device: VirtualDevice): Promise<void> {
    const scriptId = device.bleForwardScriptId;
    if (scriptId === null) {
      device.error(`No BLE forwarding script to uninstall`);
      return;
    }
    device.log('Uninstalling BLE forwarding in script:', scriptId);
    await Delete(device.getChannel(), scriptId).then(() => {
      device.bleForwardScriptId = null;
    });
    this.debug(`BLE forwarding removed from ${device.deviceId}`);
    await device.app.updateVirtualDevice(device);
  }

  public handleForward(data: BleForwardEventData): void {
    this.debug('Received BLE forward:', inspect(data, { depth: null }));
    this.btHomeMitt.emit(data.addr, data);
  }

  private debug(...args: unknown[]): void {
    if (Homey.env['BLE_DEBUG_FORWARDING'] !== '1') {
      return;
    }

    this.log('[BLE Forward]', '[dbg]', ...args);
  }
}
