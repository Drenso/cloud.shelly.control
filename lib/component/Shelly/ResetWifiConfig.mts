import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseFrame } from '../../rpc/Rpc.mjs';

/**
 * This method resets the WiFi configuration of the device.
 */
export default async function ResetWifiConfig(channel: RpcChannel): Promise<ResponseFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.ResetWifiConfig');
  return channel.sendRequestFrame(requestFrame);
}
