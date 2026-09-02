import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CameraDeleteZoneParams = {
  /** Id of the CameraZone to delete */
  zone_id: number;
};

/**
 * Delete a previously created CameraZone.
 * The default zone (created automatically when the camera is initialized) cannot be deleted.
 */
export default async function DeleteZone(
  channel: RpcChannel,
  id: number,
  params: CameraDeleteZoneParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Camera.DeleteZone', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
