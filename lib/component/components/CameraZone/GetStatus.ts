import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CameraZoneStatus } from '../CameraZone.js';

/** Obtain the component's status. */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<CameraZoneStatus>> {
  const requestFrame = createRequestFrame('CameraZone.GetStatus', { id });
  return channel.sendRequestFrame(requestFrame);
}
