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

const SCRIPT_NAME = 'Homey BLE forwarding';

type BTHomeMitt = Record<string, BleForwardEventData>;

export class BTHomeServer {
  public readonly btHomeMitt = createMitt<BTHomeMitt>();

  public async installForwardingScript(device: VirtualDevice): Promise<void> {
    const scriptPath = path.join(import.meta.dirname, 'script.js');
    const script = await readFile(scriptPath, 'utf8');
    const createResponse = await Script.Create(device.getChannel(), { name: SCRIPT_NAME });
    const scriptId = createResponse.result.id;
    device.bleForwardScriptId = scriptId;
    device.log('Installing BLE forwarding in script:', scriptId);
    await PutCode(device.getChannel(), scriptId, { code: script });
    this.debug(`Installed BLE forwarding on ${device.deviceId}, configuring...`);
    await SetConfig(device.getChannel(), scriptId, { config: { enable: true } });
    await Start(device.getChannel(), scriptId);
    this.debug(`BLE forwarding enabled on ${device.deviceId}`);
    await device.app.updateVirtualDevice(device);
  }

  public async uninstallForwardingScript(device: VirtualDevice): Promise<void> {
    const scriptId = device.bleForwardScriptId;
    if (scriptId === null) {
      this.debug(`No script to uninstall on ${device.deviceId}`);
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
    if (Homey.env['DEBUG_BLE_FORWARDING'] !== '1') {
      return;
    }

    console.log(new Date(), '[dbg]', '[ShellyApp]', '[BLE Forward]', ...args);
  }
}
