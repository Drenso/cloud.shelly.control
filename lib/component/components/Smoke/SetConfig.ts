import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SmokeConfig } from '../Smoke.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type SmokeSetConfigParams = {
  config: RecursivePartial<Omit<SmokeConfig, 'id'>, AllowedPrimitives>;
};

export type SmokeSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: SmokeSetConfigParams,
): Promise<ResponseSuccessFrame<SmokeSetConfigResponse>> {
  const requestFrame = createRequestFrame('Smoke.SetConfig', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
