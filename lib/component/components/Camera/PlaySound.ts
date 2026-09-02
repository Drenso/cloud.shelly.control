import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CameraPlaySoundParams =
  | {
      /** Name of a built-in sound to play. Mutually exclusive with file. See accepted values. */
      sound: string;
    }
  | {
      /** Path of an .opus file on the camera's SD card, relative to the card root (e.g. "audio/doorbell.opus"). Must not contain ... Mutually exclusive with sound. */
      file: string;
    };

/**
 * Plays a sound through the camera's speaker. Exactly one of sound or file must be provided:
 *  - sound plays one of the built-in sounds by name.
 *  - file plays an .opus file stored on the camera's SD card.
 * Playing sounds requires sounds.enable to be true (see Configuration); otherwise the method returns an error.
 * The camera must also not be in privacy mode — the streamer is suspended while privacy is on, so the speaker is disabled and the call fails.
 * The call completes once the streamer reports the playback result, so a missing or unplayable file is reported as an error rather than a false success.
 */
export default async function PlaySound(
  channel: RpcChannel,
  id: number,
  params: CameraPlaySoundParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Camera.PlaySound', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
