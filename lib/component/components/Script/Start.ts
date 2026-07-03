import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type ScriptStartResponse = {
  /** Whether the script was running in the previous state */
  was_running: boolean;
};

/**
 * This method runs a script.
 *
 * Up to 3 scripts can be running at any given time.
 *
 * If there is no code put in the script, the method will return an error.
 */
export default async function Start(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<ScriptStartResponse>> {
  const requestFrame = createRequestFrame('Script.Start', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
