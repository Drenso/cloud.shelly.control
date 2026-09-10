import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { EMConfig } from '../EM.js';

export type EMSetConfigParams = {
  config: RecursivePartial<Omit<EMConfig, 'id'>, AllowedPrimitives>;
};

export type EMSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: EMSetConfigParams,
): Promise<ResponseSuccessFrame<EMSetConfigResponse>> {
  const requestFrame = createRequestFrame('EM.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
