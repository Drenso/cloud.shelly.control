import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { DevicePowerStatus } from '../DevicePower.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<DevicePowerStatus>> {
  const requestFrame = createRequestFrame('DevicePower.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
