import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { ButtonConfig } from '../Button.js';

export type ButtonSetConfigParams = {
  config: RecursivePartial<Omit<ButtonConfig, 'id'>, AllowedPrimitives>;
};

export type ButtonConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: ButtonSetConfigParams,
): Promise<ResponseSuccessFrame<ButtonConfigResponse>> {
  const requestFrame = createRequestFrame('Button.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
