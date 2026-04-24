import type Homey from 'homey';

export async function safeAddCapability(device: Homey.Device, id: string): Promise<void> {
  if (device.hasCapability(id)) {
    return;
  }

  await device.addCapability(id).catch(device.error);
}

export async function safeRemoveCapability(device: Homey.Device, id: string): Promise<void> {
  if (!device.hasCapability(id)) {
    return;
  }

  await device.removeCapability(id).catch(device.error);
}

export async function safeSetCapabilityValue(device: Homey.Device, id: string, value: unknown): Promise<void> {
  if (!device.hasCapability(id)) {
    return;
  }

  await device.setCapabilityValue(id, value).catch(device.error);
}

export async function safeTriggerDeviceCard(
  device: Homey.Device,
  id: string,
  tokens?: Record<string, unknown>,
  triggerArgs?: Record<string, unknown>,
): Promise<void> {
  return device.homey.flow.getDeviceTriggerCard(id).trigger(device, tokens, triggerArgs).catch(device.error);
}
