import { type AllowedPrimitives, ComponentWithId } from '../Component.mjs';
import capabilitiesOptions from './Cover/capabilitiesOptions.json' with { type: 'json' };
import type ShellyLocalDevice from '../../local/LocalDevice.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import { deepAssign, type RecursivePartial } from '../../util.mjs';
import SetConfig from './Cover/SetConfig.mjs';
import GetConfig from './Cover/GetConfig.mjs';
import GetStatus from './Cover/GetStatus.mjs';
import type { SwitchStatus } from './Switch.mjs';
import Calibrate from './Cover/Calibrate.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import Open, { type CoverOpenParams } from './Cover/Open.mjs';
import Close, { type CoverCloseParams } from './Cover/Close.mjs';
import Stop from './Cover/Stop.mjs';
import GoToPosition, { type CoverGoToPositionParams } from './Cover/GoToPosition.mjs';
import type { CoverResetCountersParams } from './Cover/ResetCounters.mjs';
import ResetCounters from './Cover/ResetCounters.mjs';

export type CoverConfig = {
  /** Identifier of the Cover component instance */
  id: number;
  /** Name of the Cover component instance */
  name: string | null;
  /**
   * `single`:
   *   - Cover operation in both open and close directions is controlled via a single input.
   *     In this mode, only `input_0` is used to open/close/stop the Cover.
   *     It doesn't matter if `input_0` has `in_type=switch` or `in_type=button`,
   *     the behavior is the same: each switch toggle or button press cycles between open/stop/close/stop/...
   *     In single mode, `input_1` is free to be used as a safety switch
   *     (e.g. end-of-motion limit switch, emergency-stop, etc.)
   *
   * `dual`:
   *    - **when slat control disabled**:
   *         Cover operation is controlled via two inputs, one for open and one for close.
   *         In this mode, `input_0` is used to open the Cover, `input_1` is used to close the Cover.
   *         The exact behavior depends on the `in_type` of the inputs:
   *         + if `in_type = switch`:
   *           - toggle the switch to ON to move in the associated direction
   *           - toggle the switch to OFF to stop
   *         + if `in_type = button`:
   *           - press the button to move in the associated direction
   *           - press the button again to stop
   *    - **when slat control enabled**:
   *         Cover operation is controlled via two inputs, one for open and one for close.
   *         In this mode, `input_0` is used to open the Cover, `input_1` is used to close the Cover.
   *         The exact behavior depends on the `in_type` of the inputs:
   *         + if `in_type = switch`:
   *           - toggle the switch to ON to move in the associated direction
   *           - toggle the switch to OFF to stop
   *         + if `in_type = button`:
   *           - short push moves slats in open or close direction by `cover.config.slat.step` percent when cover is idle or stops if cover is in motion
   *           - long push moves whole cover in open or close direction.
   *
   * `detached`:
   *    - Cover operation via the input/inputs is prohibited
   *
   * Only present if there is at least one input associated with the Cover instance
   */
  in_mode?: 'single' | 'dual' | 'detached';
  /** If True, all changes to physical inputs are ignored, regardless of mode. */
  in_locked: boolean;
  /**
   * Defines Cover target state on power-on
   *
   * - open (Cover will fully open)
   * - closed (Cover will fully close)
   * - stopped (Cover will not change its position)
   */
  initial_state: 'open' | 'closed' | 'stopped';
  /** Watts, a limit that must be exceeded to trigger an `overpower` error */
  power_limit: number;
  /** Volts, a limit that must be exceeded to trigger an `overvoltage` error */
  voltage_limit: number;
  /** Volts, a limit that must be subceeded to trigger an `undervoltage` error */
  undervoltage_limit: number;
  /** Amperes, a limit that must be exceeded to trigger an `overcurrent` error */
  current_limit: number;
  /**
   * Configuration of the Cover motor.
   *
   * The exact contents depend on the type of motor used.
   */
  motor: AcMotorConfig;
  /** Default timeout after which Cover will stop moving in open direction */
  maxtime_open: number;
  /** Default timeout after which Cover will stop moving in a close direction */
  maxtime_close: number;
  /**
   * Defines whether the functions of the two inputs are swapped.
   *
   * The effect of swap_inputs is observable only when `in_mode != detached`.
   * Only present if there are two inputs associated with the Cover instance.
   */
  swap_inputs?: boolean;
  /**
   * Defines the motor rotation for open and close directions.
   *
   * - `false`: On open motor rotates clockwise, on close motor rotates counter-clockwise
   * - `true`: On open motor rotates counter-clockwise, on close motor rotates clockwise
   *
   * (changing this parameter requires a reboot):
   */
  invert_directions: boolean;
  /** Can be used to temporarily freeze all motions for maintenance */
  maintenance_mode: boolean;
  /** Defines the behavior of the obstruction detection safety feature */
  obstruction_detection: {
    enable: boolean;
    /** The direction of motion for which the safety switch should be monitored */
    direction: 'open' | 'close' | 'both';
    /**
     * The recovery action that should be performed if the safety switch is engaged
     * while moving in a monitored direction.
     *
     * `stop`
     * - Immediately stop Cover
     *
     * `reverse`
     * - Immediately stop Cover,
     *   then move in the opposite direction until a fully open or fully closed position is reached.
     *   If Cover encounters a new obstruction while reversing from a previous one, it will unconditionally stop.
     */
    action: 'stop' | 'reverse';
    /**
     * Watts, power consumption above this threshold should be interpreted as objects obstructing Cover movement.
     *
     * This property is editable at any time,
     * but note that during the cover calibration procedure (`Cover.Calibrate`),
     * `power_thr` will be automatically set to the peak power consumption + 15%, overwriting the current value.
     * The automatic setup of `power_thr` during calibration will only start tracking power values
     * when the `holdoff` time has elapsed
     */
    power_thr: number;
    /**
     * Seconds, time to wait after Cover starts moving before obstruction detection is activated
     * (to avoid false detections because of the initial power consumption spike)
     */
    holdoff: number;
  };
  /**
   * Defines the behavior of the safety switch feature.
   *
   * The `safety_switch` feature will only work when `in_mode=single`
   * Only present if there are two inputs associated with the Cover instance.
   */
  safety_switch: {
    /** `true` when the safety switch is enabled, `false` otherwise */
    enable: boolean;
    /** The direction of motion for which the safety switch should be monitored */
    direction: 'open' | 'close' | 'both';
    /**
     * The recovery action which should be performed if the safety switch is engaged
     * while moving in a monitored direction
     *
     *
     * `stop`
     * - Immediately stop Cover,
     *   then wait for a command to move in an allowed direction
     *
     * `reverse`
     * - Immediately stop Cover,
     *   then move in the opposite direction until a fully open or fully closed position is reached.
     *   `action = reverse` requires that `allowed_move = reverse`
     *
     * `pause`
     * - Immediately stop Cover,
     *   then either:
     *   + wait for a command to move in an allowed direction
     *   + automatically continue movement in the same direction
     *     (i.e. the one that was interrupted)
     *     when the safety switch is disengaged
     */
    action: 'stop' | 'reverse' | 'pause';
    /**
     * Allowed movement direction when the safety switch is engaged while moving in a monitored direction.
     *
     * `null`
     * - null means Cover can't be moved in either open nor closed directions while the safety switch is engaged
     *
     * `reverse`
     * - The only other option is reverse,
     *   which means Cover can only be moved in the direction opposite to the one that was interrupted
     *   (for example, if the safety switch was hit while opening,
     *   Cover can only be commanded to close if the switch is not disengaged)
     */
    allowed_move: 'reverse' | null;
  };
  /**
   * Defines the behavior of slat control (venetian blinds).
   *
   * Slat control (venetian blinds) is supported on:
   * - Plus2PM
   * - 2PM Gen3
   * - Shelly Shutter
   * - Pro2PM
   * - ProDualCoverPM
   *
   * Only present if slat control is supported
   */
  slat?: {
    /** true when slat control is enabled, false otherwise */
    enable: boolean;
    /**
     * Time it takes for slats to move from fully closed (0%) to fully open (100%) position, seconds.
     *
     * Must be manually configured by the user.
     * Accepted range: [0.5..30]s
     */
    open_time: number;
    /**
     * Time it takes for slats to move from fully open (100%) to fully closed (100%) position, seconds.
     *
     * Must be manually configured by the user.
     * Accepted range: [0.5..30]s
     */
    close_time: number;
    /**
     * Single step movement spread, represented as % from the full range
     * (used only when slats are controlled via inputs).
     *
     * Accepted range: [1..100]%
     */
    step: number;
    /** Whether to retain slat position when cover (vertical) position is changed */
    retain_pos: boolean;
    /**
     * This property only applies when cover (vertical) position is less than one full slat rotation away from the fully closed position.
     * If this condition is met, any slat movement will always go through fully closed position first.
     * This improves slat positioning accuracy, yet is slower to execute.
     */
    precise_ctl: boolean;
  };
};

type AcMotorConfig = {
  /** Watts, threshold below which the motor is considered stopped */
  idle_power_thr: number;
  /** Seconds, the minimum period of time in idle state before the state is confirmed */
  idle_confirm_period: number;
};

export type CoverStatus = {
  /**  Identifier of the Cover component instance */
  id: number;
  /** Source of the last command */
  source: string;
  /**
   * - `open`: Cover is fully open
   * - `closed`: Cover is fully closed
   * - `opening`: Cover is actively opening
   * - `closing`: Cover is actively closing
   * - `stopped`: Cover is not moving, and is neither fully open nor fully closed
   *    or the open/close state is unknown
   * - `calibrating`: Cover is performing a calibration procedure
   */
  state: 'open' | 'closed' | 'opening' | 'closing' | 'stopped' | 'calibrating';
  /** Active power in Watts */
  apower: number;
  /** Volts */
  voltage: number;
  /** Amperes */
  current: number;
  /** power factor */
  pf: number;
  /** network frequency, Hz */
  freq: number;
  /**
   * Energy counter information,
   * same as in the Switch component status
   */
  aenergy: SwitchStatus['aenergy'];
  /**
   * Represents current position in percent from 0 (fully closed) to 100 (fully open).
   *
   * null if the position is unknown
   *
   * Only present if Cover is calibrated.
   */
  current_pos?: number | null;
  /**
   * Represents the target position in percent from 0 (fully closed) to 100 (fully open).
   *
   * null if target position has been reached or the movement was canceled
   *
   * Only present if Cover is calibrated and is actively moving to a requested position
   * in either open or closed directions.
   */
  target_pos?: number | null;
  /**
   * Cover will automatically stop after the timeout expires, Seconds.
   *
   * Only present if Cover is actively moving in either open or closed directions.
   */
  move_timeout?: number;
  /**
   * Represents the time at which the movement has begun.
   *
   * Only present if Cover is actively moving in either open or closed directions.
   */
  move_started_at?: number;
  /**
   * - `false`: if Cover is not calibrated and only discrete open/close is possible
   * - `true`: if Cover is calibrated and can be commanded to go to arbitrary positions between fully open and fully closed
   */
  pos_control: boolean;
  /**
   * Direction of the last movement
   *
   * null when unknown
   */
  last_direction: 'open' | 'close' | null;
  /**
   * Temperature sensor information, only present if a temperature monitor is associated with the Cover instance
   */
  temperature?: SwitchStatus['temperature'];
  /**
   * Represents current slat position in percent from 0 (fully closed) to 100 (fully open)
   *
   * null if the position is unknown
   *
   * Only present if slat control is supported and enabled.
   */
  slat_pos?: number;
  /**
   * The errors are set when one or more of the following conditions occurs:
   *
   * - `overtemp`: When the temperature exceeds a predefined limit,
   *     Cover will stop immediately
   *
   * - `overpower`: When power exceeds the configured limit,
   *     Cover will stop immediately
   *
   * - `overvoltage`: When the voltage exceeds configured limit,
   *     Cover will stop immediately
   *
   * - `undervoltage`: When voltage subceeds configured limit,
   *     Cover will stop immediately
   *
   * - `overcurrent`: When current exceeds the configured limit,
   *     Cover will stop immediately
   *
   * - `obstruction`: When an obstruction is hit,
   *     Cover will execute a configured recovery action (stop or reverse)
   *
   * - `safety_switch`: When the safety switch is engaged while Cover is moving in one of the monitored directions
   *     (see `safety_switch.direction`) the error will be set immediately,
   *     Cover will execute a configured recovery action (stop, reverse of pause).
   *     When the safety switch is engaged while Cover is idle or moving in a non-monitored direction,
   *     the error will be set on the first open/close/go to position command that requests a movement
   *     in one of the monitored directions (see `safety_switch.direction`)
   *
   * - `bad_feedback:rotating_in_wrong_direction`: When the power meter's feedback indicates
   *     the motor is rotating in a different direction than commanded;
   *     Cover will stop immediately
   *
   * - `bad_feedback:both_directions_active`: When power meters feedback indicates
   *     both outputs connected to the motor are active simultaneously (this should never be possible);
   *     Cover will stop immediately
   *
   * - `bad_feedback:failed_to_halt`: When power meters feedback indicates
   *     the motor is still rotating though it has been commanded to stop
   *
   * - `cal_abort:timeout_open`: When calibration is aborted since
   *     Cover failed to reach a fully open position within the configured timeout (`maxtime_open`)
   *
   * - `cal_abort:timeout_close`: When calibration is aborted since
   *     Cover failed to reach a fully closed position within the configured timeout (`maxtime_close`)
   *
   * - `cal_abort:safety`: When calibration is aborted since
   *     a Cover safety feature got triggered during the calibration process
   *     (this means that at least one of
   *     `overtemp`, `overpower`, `overvoltage`, `undervoltage`, `overcurrent`, `safety_switch`
   *     will also be present in errors)
   *
   * - `cal_abort:ext_command`: When calibration is aborted since
   *     Cover received an external command to stop during the calibration process (via input, RPC call, etc.)
   *
   * - `cal_abort:bad_feedback`: When calibration is aborted since
   *     Cover reported a mismatch between expected motor state and power meters feedback during the calibration process
   *     (this means that at least one of
   *     `bad_feedback:rotating_in_wrong_direction`, `bad_feedback:both_directions_active`, `bad_feedback:failed_to_halt`
   *     will also be present in errors)
   *
   * - `cal_abort:implausible_time_to_fully_close`: When calibration is aborted since
   *     the measured time to fully close is negative or 0
   *
   * - `cal_abort:implausible_time_to_fully_open`: When calibration is aborted since
   *     the measured time to fully open is negative or 0
   *
   * - `cal_abort:implausible_power_consumption_in_close_dir`: When calibration is aborted since
   *     measured power consumption in close direction is negative or 0
   *
   * - `cal_abort:implausible_power_consumption_in_open_dir`: When calibration is aborted since
   *     measured power consumption in open direction is negative or 0
   *
   * - `cal_abort:too_many_steps_to_close`: When calibration is aborted since
   *     it took more steps than allowed to reach a fully closed position during the 10-step-calibration-movement
   *
   * - `cal_abort:too_few_steps_to_close`: When calibration is aborted since
   *     it took fewer steps than allowed to reach a fully closed position during the 10-step-calibration-movement
   *
   * - `cal_abort:implausible_time_to_fully_close_w_steps`: When calibration is aborted since
   *     the time to reach a fully closed position during the 10-step-calibration-movement is negative or 0
   *
   * - `cal_abort:implausible_step_duration_in_open_dir`: When calibration is aborted since
   *     the actual step duration during the 10-step-calibration-movement in open direction is negative or 0
   *
   * - `cal_abort:too_many_steps_to_open`: When calibration is aborted since
   *     it took more steps than allowed to reach a fully open position during the 10-step-calibration-movement
   *
   * - `cal_abort:too_few_steps_to_open`: When calibration is aborted since
   *     it took fewer steps than allowed to reach a fully open position during the 10-step-calibration-movement
   *
   * - `cal_abort:implausible_time_to_fully_open_w_steps`: When calibration is aborted since
   *     the time to reach fully open position during the 10-step-calibration-movement is negative or 0
   *
   * The following errors are cleared when the device recovered from the wrong condition:
   * - `overtemp`: when temperature falls below a predefined limit
   * - `overpower`: On the first open/close/go to position command after the emergency stop
   * - `overvoltage`: When voltage falls below configured limit
   * - `undervoltage`: When voltage goes above configured limit
   * - `overcurrent`: On the first open/close/go to position command after the emergency stop
   * - `obstruction`: On the first open/close/go to position command after the recovery action
   * - `safety_switch`: When the safety switch is disengaged
   * - `bad_feedback`: On the first open/close/go to position/calibrate command after the emergency stop
   * - `cal_abort`: On the first open/close/calibrate command after the error has been set
   *
   * Only present if an error condition has occurred
   */
  errors?: (
    | 'overtemp'
    | 'overpower'
    | 'overvoltage'
    | 'undervoltage'
    | 'overcurrent'
    | 'obstruction'
    | 'safety_switch'
    | 'bad_feedback:rotating_in_wrong_direction'
    | 'bad_feedback:both_directions_active'
    | 'bad_feedback:failed_to_halt'
    | 'cal_abort:timeout_open'
    | 'cal_abort:timeout_close'
    | 'cal_abort:safety'
    | 'cal_abort:ext_command'
    | 'cal_abort:bad_feedback'
    | 'cal_abort:implausible_time_to_fully_close'
    | 'cal_abort:implausible_time_to_fully_open'
    | 'cal_abort:implausible_power_consumption_in_close_dir'
    | 'cal_abort:implausible_power_consumption_in_open_dir'
    | 'cal_abort:too_many_steps_to_close'
    | 'cal_abort:too_few_steps_to_close'
    | 'cal_abort:implausible_time_to_fully_close_w_steps'
    | 'cal_abort:implausible_step_duration_in_open_dir'
    | 'cal_abort:too_many_steps_to_open'
    | 'cal_abort:too_few_steps_to_open'
    | 'cal_abort:implausible_time_to_fully_open_w_steps'
  )[];
};

export type CoverHomeySettings = {
  'Cover:in_mode': 'single' | 'dual' | 'detached';
  'Cover:in_locked': boolean;
  'Cover:initial_state': 'open' | 'closed' | 'stopped';
  'Cover:power_limit': number;
  'Cover:voltage_limit': number;
  'Cover:undervoltage_limit': number;
  'Cover:current_limit': number;
  'Cover:motor.idle_power_thr': number;
  'Cover:motor.idle_confirm_period': number;
  'Cover:maxtime_open': number;
  'Cover:maxtime_close': number;
  'Cover:swap_inputs': boolean;
  'Cover:invert_directions': boolean;
  'Cover:maintenance_mode': boolean;
  'Cover:obstruction_detection.enable': boolean;
  'Cover:obstruction_detection.direction': 'open' | 'close' | 'both';
  'Cover:obstruction_detection.action': 'stop' | 'reverse';
  'Cover:obstruction_detection.power_thr': number;
  'Cover:obstruction_detection.holdoff': number;
  'Cover:safety_switch.enable': boolean;
  'Cover:safety_switch.direction': 'open' | 'close' | 'both';
  'Cover:safety_switch.action': 'stop' | 'reverse' | 'pause';
  'Cover:safety_switch.allowed_move': 'reverse' | 'none';
  // 'Cover:slat.enable': boolean; // TODO enable once dynamic capabilities are supported
  'Cover:slat.open_time': number;
  'Cover:slat.close_time': number;
  'Cover:slat.step': number;
  'Cover:slat.retain_pos': boolean;
  'Cover:slat.precise_ctl': boolean;
};

const simpleSettingKeys = [
  'in_mode',
  'in_locked',
  'initial_state',
  'power_limit',
  'voltage_limit',
  'undervoltage_limit',
  'current_limit',
  'maxtime_open',
  'maxtime_close',
  'swap_inputs',
  'invert_directions',
  'maintenance_mode',
] as const satisfies (keyof CoverConfig)[];

const motorSettingKeys = ['idle_power_thr', 'idle_confirm_period'] as const satisfies (keyof CoverConfig['motor'])[];

const obstructionDetectionSettingKeys = [
  'enable',
  'direction',
  'action',
  'power_thr',
  'holdoff',
] as const satisfies (keyof CoverConfig['obstruction_detection'])[];

const safetySwitchSettingKeys = [
  'enable',
  'direction',
  'action',
] as const satisfies (keyof CoverConfig['safety_switch'])[];

const slatSettingKeys = [
  'open_time',
  'close_time',
  'step',
  'retain_pos',
  'precise_ctl',
] as const satisfies (keyof Required<CoverConfig>['slat'])[];

/**
 * The Cover component handles the operation of motorized garage doors, window blinds, roof skylights etc.
 */
export default class Cover extends ComponentWithId<'Cover', CoverStatus, CoverConfig, CoverHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Cover';
  public static readonly uiName = 'Cover';

  public async Calibrate(channel: RpcChannel): ReturnType<typeof Calibrate> {
    return Calibrate(channel, this.id);
  }

  public async Open(channel: RpcChannel, params?: CoverOpenParams): ReturnType<typeof Open> {
    return Open(channel, this.id, params);
  }

  public async Close(channel: RpcChannel, params?: CoverCloseParams): ReturnType<typeof Close> {
    return Close(channel, this.id, params);
  }

  public async Stop(channel: RpcChannel): ReturnType<typeof Stop> {
    return Stop(channel, this.id);
  }

  public async GoToPosition(channel: RpcChannel, params: CoverGoToPositionParams): ReturnType<typeof GoToPosition> {
    return GoToPosition(channel, this.id, params);
  }

  public async ResetCounters(channel: RpcChannel, params?: CoverResetCountersParams): ReturnType<typeof ResetCounters> {
    return ResetCounters(channel, this.id, params);
  }

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<'Cover'>[]): Promise<void> {
    {
      const homeyCapability = 'windowcoverings_state';
      await this.registerCapability(homeyDevice, 'state', homeyCapability).catch(homeyDevice.error);
      homeyDevice.registerCapabilityListener(homeyCapability, async (value: 'up' | 'idle' | 'down') => {
        if (value === 'up') {
          await this.Open(this.device.getChannel());
        } else if (value === 'down') {
          await this.Close(this.device.getChannel());
        } else {
          await this.Stop(this.device.getChannel());
        }
      });
    }

    if (this.status.pos_control) {
      {
        const homeyCapability = 'windowcoverings_set';
        await this.registerCapability(homeyDevice, 'current_pos', homeyCapability).catch(homeyDevice.error);
        homeyDevice.registerCapabilityListener(homeyCapability, async (value: number) => {
          const percentage = value * 100;
          await this.GoToPosition(this.device.getChannel(), {
            pos: percentage,
          });
        });
      }
      {
        const homeyCapability = 'windowcoverings_tilt_set';
        await this.registerCapability(homeyDevice, 'slat_pos', homeyCapability).catch(homeyDevice.error);
        homeyDevice.registerCapabilityListener(homeyCapability, async (value: number) => {
          const percentage = value * 100;
          await this.GoToPosition(this.device.getChannel(), {
            slat_pos: percentage,
          });
        });
      }
    }

    await this.registerCapability(homeyDevice, 'apower', 'measure_power').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'voltage', 'measure_voltage').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'current', 'measure_current').catch(homeyDevice.error);
    // TODO power factor
    await this.registerCapability(homeyDevice, 'freq', 'measure_frequency').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'aenergy', 'meter_power').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'temperature', 'measure_temperature.cover').catch(homeyDevice.error);
    // TODO errors

    if (methods.includes('ResetCounters')) {
      const maintenanceActionId = 'button.reset_energy_counters';
      await homeyDevice.safeAddCapability(maintenanceActionId);
      homeyDevice.registerCapabilityListener(maintenanceActionId, async () => {
        await this.ResetCounters(this.device.getChannel());
      });
      await homeyDevice
        .setCapabilityOptions(maintenanceActionId, capabilitiesOptions['button.reset_energy_counters'])
        .catch(homeyDevice.error);
    }

    // Set correct capability values
    await this.onStatusUpdate(homeyDevice, this.status);
    // Set correct setting values
    await this.onConfigUpdate(homeyDevice, this.config);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<CoverStatus>): Promise<void> {
    const state = this.status.state;
    if (state !== undefined) {
      const stateMapping = {
        open: 'up',
        opening: 'up',
        closed: 'down',
        closing: 'down',
        stopped: 'idle',
        calibrating: null,
      } as const satisfies Record<CoverStatus['state'], 'up' | 'idle' | 'down' | null>;
      const value = stateMapping[state];
      await homeyDevice.safeSetCapability('windowcoverings_state', value);
    }

    const currentPos = status.current_pos;
    if (currentPos === null) {
      await homeyDevice.safeSetCapability('windowcoverings_set', currentPos);
    } else if (currentPos !== undefined) {
      const value = currentPos / 100;
      await homeyDevice.safeSetCapability('windowcoverings_set', value);
    }

    const slatPos = status.slat_pos;
    if (slatPos !== undefined) {
      const value = slatPos / 100;
      await homeyDevice.safeSetCapability('windowcoverings_tilt_set', value);
    }

    await this.updateMeasured(homeyDevice, status, 'apower', 'measure_power');
    await this.updateMeasured(homeyDevice, status, 'voltage', 'measure_voltage');
    await this.updateMeasured(homeyDevice, status, 'current', 'measure_current');
    // TODO power factor
    await this.updateMeasured(homeyDevice, status, 'freq', 'measure_frequency');
    if (status.aenergy?.total !== undefined) {
      await homeyDevice.safeSetCapability('meter_power', status.aenergy.total / 1000);
    }
    if (status.temperature !== undefined) {
      await homeyDevice.safeSetCapability('measure_temperature.cover', status.temperature.tC);
    }
    // TODO errors
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: CoverConfig): Promise<void> {
    const newSettings: RecursivePartial<CoverHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Cover:${settingKey}`] = config[settingKey] as never;
      }
    }

    for (const motorSettingKey of motorSettingKeys) {
      const newValue = config['motor'][motorSettingKey];
      if (newValue !== undefined) {
        newSettings[`Cover:motor.${motorSettingKey}`] = newValue;
      }
    }

    for (const obstructionDetectionSettingKey of obstructionDetectionSettingKeys) {
      const newValue = config['obstruction_detection'][obstructionDetectionSettingKey];
      if (newValue !== undefined) {
        newSettings[`Cover:obstruction_detection.${obstructionDetectionSettingKey}`] = newValue as never;
      }
    }

    for (const safetySwitchSettingKey of safetySwitchSettingKeys) {
      const newValue = config['safety_switch'][safetySwitchSettingKey];
      if (newValue !== undefined) {
        newSettings[`Cover:safety_switch.${safetySwitchSettingKey}`] = newValue as never;
      }
    }

    if (config['slat'] !== undefined) {
      for (const slatSettingKey of slatSettingKeys) {
        const newValue = config['slat'][slatSettingKey];
        if (newValue !== undefined) {
          newSettings[`Cover:slat.${slatSettingKey}`] = newValue as never;
        }
      }
    }

    const safetySwitchAllowedMove = config['safety_switch']['allowed_move'];
    if (safetySwitchAllowedMove !== undefined) {
      newSettings['Cover:safety_switch.allowed_move'] =
        safetySwitchAllowedMove === null ? 'none' : safetySwitchAllowedMove;
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<CoverHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<CoverConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `Cover:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    for (const settingKey of motorSettingKeys) {
      const homeySettingKey = `Cover:motor.${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { motor: { [settingKey]: newSettings[homeySettingKey] } });
      }
    }

    for (const settingKey of obstructionDetectionSettingKeys) {
      const homeySettingKey = `Cover:obstruction_detection.${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { obstruction_detection: { [settingKey]: newSettings[homeySettingKey] } });
      }
    }

    for (const settingKey of safetySwitchSettingKeys) {
      const homeySettingKey = `Cover:safety_switch.${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { safety_switch: { [settingKey]: newSettings[homeySettingKey] } });
      }
    }

    for (const settingKey of slatSettingKeys) {
      const homeySettingKey = `Cover:slat.${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { slat: { [settingKey]: newSettings[homeySettingKey] } });
      }
    }

    if (changedKeys.includes('Cover:safety_switch.allowed_move')) {
      const allowedMove = newSettings['Cover:safety_switch.allowed_move'];
      deepAssign(changedConfig, { safety_switch: { allowed_move: allowedMove === 'none' ? null : allowedMove } });
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }

  private async registerCapability(
    homeyDevice: ShellyLocalDevice,
    statusProperty: keyof CoverStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (this.status[statusProperty] === undefined) {
      return;
    }

    await homeyDevice.safeAddCapability(homeyCapability);
    const capabilityOptions = capabilitiesOptions[homeyCapability as keyof typeof capabilitiesOptions];
    if (capabilityOptions === undefined) {
      return;
    }

    await homeyDevice.setCapabilityOptions(homeyCapability, capabilityOptions);
  }

  private async updateMeasured(
    homeyDevice: ShellyLocalDevice,
    status: Partial<CoverStatus>,
    statusProperty: keyof CoverStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (status[statusProperty] === undefined) {
      return;
    }

    await homeyDevice.safeSetCapability(homeyCapability, status[statusProperty]).catch(homeyDevice.error);
  }
}
