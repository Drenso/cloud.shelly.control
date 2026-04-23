import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { SystemConfig } from '../System.js';
import type { AllowedPrimitives } from '../../Component.js';

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
