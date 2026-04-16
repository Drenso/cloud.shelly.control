import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { DevicePowerStatus } from '../DevicePower.mjs';

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
