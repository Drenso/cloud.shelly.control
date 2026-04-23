import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { IlluminanceStatus } from '../Illuminance.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<IlluminanceStatus>> {
  const requestFrame = createRequestFrame('Illuminance.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
