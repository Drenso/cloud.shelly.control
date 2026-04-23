import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CCTConfig } from '../CCT.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

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
