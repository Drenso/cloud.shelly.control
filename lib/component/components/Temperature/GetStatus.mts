import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { TemperatureStatus } from '../Temperature.mjs';

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
