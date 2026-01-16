import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { SwitchConfig } from '../Switch.mjs';

type SwitchSetConfigParams = {
  // Identifier of the Switch component instance
  id: number;
  config: Partial<Omit<SwitchConfig, 'id'>>;
};

type SwitchSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: SwitchSetConfigParams,
): Promise<ResponseSuccessFrame<SwitchSetConfigResponse>> {
  const requestFrame = createRequestFrame('Switch.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
