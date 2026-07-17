import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * This method returns the status of all the components of the device.
 */
export default async function GetStatus<Status extends object>(
  channel: RpcChannel,
): Promise<ResponseSuccessFrame<Status>> {
  const requestFrame = createRequestFrame('Shelly.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
