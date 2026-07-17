import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * This method returns the configuration of all the components of the device.
 */
export default async function GetConfig<Config extends object>(
  channel: RpcChannel,
): Promise<ResponseSuccessFrame<Config>> {
  const requestFrame = createRequestFrame('Shelly.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
