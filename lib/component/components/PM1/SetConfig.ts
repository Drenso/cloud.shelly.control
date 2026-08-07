import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PM1Config } from '../PM1.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type PM1SetConfigParams = {
  config: RecursivePartial<Omit<PM1Config, 'id'>, AllowedPrimitives>;
};

export type PM1SetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: PM1SetConfigParams,
): Promise<ResponseSuccessFrame<PM1SetConfigResponse>> {
  const requestFrame = createRequestFrame('PM1.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
