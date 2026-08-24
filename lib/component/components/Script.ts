import { ComponentWithId } from '../Component.js';
import SetConfig from './Script/SetConfig.js';
import GetConfig from './Script/GetConfig.js';
import GetStatus from './Script/GetStatus.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import List from './Script/List.js';
import Create from './Script/Create.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import Delete from './Script/Delete.js';
import Start from './Script/Start.js';
import Stop from './Script/Stop.js';
import PutCode, { type ScriptPutCodeParams } from './Script/PutCode.js';
import GetCode, { type ScriptGetCodeParams } from './Script/GetCode.js';
import Eval, { type ScriptEvalParams } from './Script/Eval.js';
import { createMitt } from '../../util.js';
import type { NotificationEventParam } from '../../rpc/Rpc.js';
import { safeAddCapability } from '../../safeFunctions.js';

export type ScriptConfig = {
  /** Identifier of the script */
  id: number;
  /** Name of the script */
  name: string;
  /** Whether the script starts on boot */
  enable: boolean;
};

export type ScriptStatus = {
  /** Identifier of the script */
  id: number;
  /** Whether the script is currently running */
  running: boolean;
  /** Memory currently used by this script, in bytes */
  mem_used: number;
  /** Peak memory used by this script since startup, in bytes */
  mem_peak: number;
  /** Memory currently available for all scripts, in bytes */
  mem_free: number;
  /**
   * Portion of time spent in the JS interpreter of this script instance.
   *
   * Calculated every 10 seconds
   */
  cpu?: number;
  /**
   * Present only when the script execution resulted in an error.
   * The array contains the description of the type of error.
   */
  errors?: ScriptError[];
};

type ScriptError =
  /** The script caused a device crash */
  | 'crashed'
  /** Incorrect javascript syntax */
  | 'syntax_error'
  /** Undefined variable */
  | 'reference_error'
  /** Accessing unexistent property or property with wrong type */
  | 'type_error'
  /** Out of memory */
  | 'out_of_memory'
  /** Out of code space */
  | 'out_of_codespace'
  /** Internal interpreter error */
  | 'internal_error'
  /** Functionality not implemented */
  | 'not_implemented'
  /** File read error */
  | 'file_read_error'
  /** Arguments fail verification */
  | 'bad_arguments';

type ScriptHomeySettings = Record<string, never>;

type ScriptMittEvents = Record<string, unknown>;

type ScriptEvent = NotificationEventParam & { data: unknown };

export default class Script extends ComponentWithId<'Script', ScriptStatus, ScriptConfig, ScriptHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Script';
  public static readonly uiName = 'Script';
  protected static readonly key = 'script';

  public readonly scriptMitt = createMitt<ScriptMittEvents>();

  public static readonly List = List;
  public static readonly Create = Create;

  public async Delete(channel: RpcChannel): ReturnType<typeof Delete> {
    return Delete(channel, this.id);
  }

  public async Start(channel: RpcChannel): ReturnType<typeof Start> {
    return Start(channel, this.id);
  }

  public async Stop(channel: RpcChannel): ReturnType<typeof Stop> {
    return Stop(channel, this.id);
  }

  public async PutCode(channel: RpcChannel, params: ScriptPutCodeParams): ReturnType<typeof PutCode> {
    return PutCode(channel, this.id, params);
  }

  public async GetCode(channel: RpcChannel, params?: ScriptGetCodeParams): ReturnType<typeof GetCode> {
    return GetCode(channel, this.id, params);
  }

  public async Eval(channel: RpcChannel, params: ScriptEvalParams): ReturnType<typeof Eval> {
    return Eval(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Script'>[],
  ): Promise<void> {
    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: ScriptStatus): Promise<void> {
    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: ScriptConfig): Promise<void> {}

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    const scriptEvent = event as ScriptEvent;
    this.scriptMitt.emit(scriptEvent.event, scriptEvent.data);
  }
}
