import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { BooleanConfig } from '../Boolean.js';

export type BooleanSetConfigParams = {
  config: RecursivePartial<Omit<BooleanConfig, 'id'>, AllowedPrimitives>;
};

export type BooleanConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: BooleanSetConfigParams,
): Promise<ResponseSuccessFrame<BooleanConfigResponse>> {
  const requestFrame = createRequestFrame('Boolean.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
