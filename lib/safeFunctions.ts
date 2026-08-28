import Homey from 'homey';

export async function safeAddCapability(device: Homey.Device, capabilityId: string): Promise<void> {
  if (device.hasCapability(capabilityId)) {
    return;
  }

  await device.addCapability(capabilityId).catch(device.error);
}

export async function safeRemoveCapability(device: Homey.Device, capabilityId: string): Promise<void> {
  if (!device.hasCapability(capabilityId)) {
    return;
  }

  await device.removeCapability(capabilityId).catch(device.error);
}

export async function safeSetCapabilityValue(
  device: Homey.Device,
  capabilityId: string,
  value: unknown,
  addIfNotExists?: boolean,
): Promise<void> {
  if (addIfNotExists === true) {
    await safeAddCapability(device, capabilityId);
  }

  if (!device.hasCapability(capabilityId)) {
    return;
  }

  await device.setCapabilityValue(capabilityId, value).catch(device.error);
}

export async function safeTriggerDeviceCard(
  device: Homey.Device,
  flowId: string,
  tokens?: Record<string, unknown>,
  triggerArgs?: Record<string, unknown>,
): Promise<void> {
  if (Homey.env.DEBUG === '1') {
    device.log('[flow dbg]', flowId, JSON.stringify(tokens), JSON.stringify(triggerArgs));
  }

  return device.homey.flow.getDeviceTriggerCard(flowId).trigger(device, tokens, triggerArgs).catch(device.error);
}
