import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { VoltmeterConfig } from '../Voltmeter.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<VoltmeterConfig>> {
  const requestFrame = createRequestFrame('Voltmeter.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
