import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type PresenceSetSensorParams = {
  enable: boolean;
};

/**
 * Enable or disable tracking sensor.
 *
 * This is shortcut to change the `enable` parameter in config section.
 */
export default async function SetSensor(
  channel: RpcChannel,
  params: PresenceSetSensorParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Presence.SetSensor', params);
  return channel.sendRequestFrame(requestFrame);
}
