import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CameraZoneConfig } from '../CameraZone.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type CameraZoneSetConfigParams = {
  config: RecursivePartial<Omit<CameraZoneConfig, 'id'>, AllowedPrimitives>;
};

export type CameraZoneSetConfigResponse = {
  restart_required: boolean;
};

/** Update the component's configuration. */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: CameraZoneSetConfigParams,
): Promise<ResponseSuccessFrame<CameraZoneSetConfigResponse>> {
  const requestFrame = createRequestFrame('CameraZone.SetConfig', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
