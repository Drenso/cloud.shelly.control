import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type ScriptStopResponse = {
  /** Whether the script was running in the previous state */
  was_running: boolean;
};

/**
 * This method stops the execution of a script.
 */
export default async function Stop(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ScriptStopResponse>> {
  const requestFrame = createRequestFrame('Script.Stop', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
