import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { HumidityStatus } from '../Humidity.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<HumidityStatus>> {
  const requestFrame = createRequestFrame('Humidity.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
