import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseFrame } from '../../rpc/Rpc.mjs';

type ShellyRebootParams = {
  // Delay until reboot in milliseconds.
  // Any values are valid but the minimum is capped at 500 ms.
  // Default value: 1000 ms.
  delay_ms?: number;
};

/**
 * This method reboots the device.
 */
export default async function Reboot(channel: RpcChannel, params?: ShellyRebootParams): Promise<ResponseFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.Reboot', params);
  return channel.sendRequestFrame(requestFrame);
}
