import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { LightConfig } from '../Light.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

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
