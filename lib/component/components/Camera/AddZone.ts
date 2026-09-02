import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { CameraZoneConfig } from '../CameraZone.js';

export type CameraAddZoneParams = {
  config: RecursivePartial<Omit<CameraZoneConfig, 'id'>, AllowedPrimitives>;
};

export type CameraAddZoneResponse = {
  added: `camerazone:${number}`;
};

/** Create a new CameraZone. The zone definition is supplied directly as parameters of the call. */
export default async function AddZone(
  channel: RpcChannel,
  id: number,
  params: CameraAddZoneParams,
): Promise<ResponseSuccessFrame<CameraAddZoneResponse>> {
  const requestFrame = createRequestFrame('Camera.AddZone', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
