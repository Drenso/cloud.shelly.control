import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { TemperatureStatus } from '../Temperature.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<TemperatureStatus>> {
  const requestFrame = createRequestFrame('Temperature.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
