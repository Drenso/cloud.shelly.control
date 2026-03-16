import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { CoverConfig } from '../Cover.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

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
