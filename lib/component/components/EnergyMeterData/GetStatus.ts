import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EnergyMeterDataStatus } from '../EnergyMeterData.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<EnergyMeterDataStatus>> {
  const requestFrame = createRequestFrame('EMData.GetStatus', { id });
  return channel.sendRequestFrame(requestFrame);
}
