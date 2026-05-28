import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { VoltmeterStatus } from '../Voltmeter.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<VoltmeterStatus>> {
  const requestFrame = createRequestFrame('Voltmeter.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
