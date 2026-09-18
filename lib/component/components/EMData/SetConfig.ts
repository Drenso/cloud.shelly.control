import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { EMDataConfig } from '../EMData.js';

export type EMDataSetConfigParams = {
  config: RecursivePartial<Omit<EMDataConfig, 'id'>, AllowedPrimitives>;
};

export type EMDataSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: EMDataSetConfigParams,
): Promise<ResponseSuccessFrame<EMDataSetConfigResponse>> {
  const requestFrame = createRequestFrame('EMData.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
