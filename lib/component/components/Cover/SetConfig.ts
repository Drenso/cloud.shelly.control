import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CoverConfig } from '../Cover.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type CoverSetConfigParams = {
  config: RecursivePartial<Omit<CoverConfig, 'id'>, AllowedPrimitives>;
};

export type CoverSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: CoverSetConfigParams,
): Promise<ResponseSuccessFrame<CoverSetConfigResponse>> {
  const requestFrame = createRequestFrame('Cover.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
