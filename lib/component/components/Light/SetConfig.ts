import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { LightConfig } from '../Light.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type LightSetConfigParams = {
  config: RecursivePartial<Omit<LightConfig, 'id'>, AllowedPrimitives>;
};

export type LightSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: LightSetConfigParams,
): Promise<ResponseSuccessFrame<LightSetConfigResponse>> {
  const requestFrame = createRequestFrame('Light.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
