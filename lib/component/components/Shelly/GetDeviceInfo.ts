import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

type ShellyGetDeviceInfoParams = {
  // Flag specifying if extra identifying information should be displayed.
  ident?: boolean;
};

// TODO make presence dependent on request ident param
export type ShellyGetDeviceInfoResponse = {
  // Identifier of the device
  id: string;
  // Mac address of the device
  mac: string;
  // Model of the device
  model: string;
  // Generation of the device
  gen: 4;
  // Identifier of the firmware of the device
  fw_id: string;
  // Version of the firmware of the device
  ver: string;
  // Application name
  app: string;
  // Name of the device profile (only applicable for multi-profile devices)
  profile?: string;
  // true if authentication is enabled, false otherwise
  auth_en: false;
  // Name of the domain (null if authentication is not enabled)
  auth_domain: string | null;
  // Present only when false.
  // If true, device is shown in 'Discovered devices'.
  // If false, the device is hidden.
  discoverable?: false;
  // Cloud key of the device (see note below), present only when the ident parameter is set to true
  key?: string;
  // Batch used to provision the device, present only when the ident parameter is set to true
  batch?: string;
  // Shelly internal flags, present only when the ident parameter is set to true
  fw_sbits?: string;

  // Undocumented
  name: string | null;
  /*
  slot: 0;
  selftest_skip: true;
  matter: false;
  */
} & Record<string, unknown>;

/**
 * This method returns information about the device.
 */
export default async function GetDeviceInfo(
  channel: RpcChannel,
  params?: ShellyGetDeviceInfoParams,
): Promise<ResponseSuccessFrame<ShellyGetDeviceInfoResponse>> {
  const requestFrame = createRequestFrame('Shelly.GetDeviceInfo', params);
  return channel.sendRequestFrame(requestFrame);
}
