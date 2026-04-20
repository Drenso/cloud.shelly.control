import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { EM1Config } from '../EM1.js';

export type EM1SetConfigParams = {
  config: RecursivePartial<Omit<EM1Config, 'id'>, AllowedPrimitives>;
};

export type EM1SetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: EM1SetConfigParams,
): Promise<ResponseSuccessFrame<EM1SetConfigResponse>> {
  const requestFrame = createRequestFrame('EM1.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
