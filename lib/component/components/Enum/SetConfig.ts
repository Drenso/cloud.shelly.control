import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { EnumConfig } from '../Enum.js';

export type EnumSetConfigParams = {
  config: RecursivePartial<Omit<EnumConfig, 'id'>, AllowedPrimitives>;
};

export type EnumConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: EnumSetConfigParams,
): Promise<ResponseSuccessFrame<EnumConfigResponse>> {
  const requestFrame = createRequestFrame('Enum.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
