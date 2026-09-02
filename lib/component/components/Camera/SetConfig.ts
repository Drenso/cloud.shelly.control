import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CameraConfig } from '../Camera.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type CameraSetConfigParams = {
  config: RecursivePartial<CameraConfig, AllowedPrimitives>;
};

export type CameraSetConfigResponse = {
  restart_required: boolean;
};

/** Update the component's configuration. */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: CameraSetConfigParams,
): Promise<ResponseSuccessFrame<CameraSetConfigResponse>> {
  const requestFrame = createRequestFrame('Camera.SetConfig', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
