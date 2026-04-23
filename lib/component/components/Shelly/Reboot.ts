import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

type ShellyRebootParams = {
  // Delay until reboot in milliseconds.
  // Any value is valid, but the minimum is capped at 500 ms.
  // Default value: 1000 ms.
  delay_ms?: number;
};

/**
 * This method reboots the device.
 */
export default async function Reboot(
  channel: RpcChannel,
  params?: ShellyRebootParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.Reboot', params);
  return channel.sendRequestFrame(requestFrame);
}
