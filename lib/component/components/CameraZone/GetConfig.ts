import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CameraZoneConfig } from '../CameraZone.js';

/** Obtain the component's configuration. */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<CameraZoneConfig>> {
  const requestFrame = createRequestFrame('CameraZone.GetConfig', { id });
  return channel.sendRequestFrame(requestFrame);
}
