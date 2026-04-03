import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { CCTConfig } from '../CCT.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

export type CCTSetConfigParams = {
  config: RecursivePartial<Omit<CCTConfig, 'id'>, AllowedPrimitives>;
};

export type CCTSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: CCTSetConfigParams,
): Promise<ResponseSuccessFrame<CCTSetConfigResponse>> {
  const requestFrame = createRequestFrame('CCT.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
