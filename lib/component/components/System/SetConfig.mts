import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { SystemConfig } from '../System.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

export type SystemSetConfigParams = {
  config: RecursivePartial<SystemConfig, AllowedPrimitives>;
};

export type SystemSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: SystemSetConfigParams,
): Promise<ResponseSuccessFrame<SystemSetConfigResponse>> {
  const requestFrame = createRequestFrame('Sys.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
