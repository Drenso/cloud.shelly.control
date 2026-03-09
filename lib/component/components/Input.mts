import { type AllowedPrimitives, ComponentWithId } from '../Component.mjs';
import type ShellyLocalDevice from '../../Device.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import type { RecursivePartial } from '../../util.mjs';
import SetConfig from './Input/SetConfig.mjs';
import GetConfig from './Input/GetConfig.mjs';
import GetStatus from './Input/GetStatus.mjs';
import CheckExpression from './Input/CheckExpression.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import type { InputResetCountersParams, InputResetCountersResponse } from './Input/ResetCounters.mjs';
import type { NotificationEventParam, ResponseSuccessFrame } from '../../rpc/Rpc.mjs';
import ResetCounters from './Input/ResetCounters.mjs';
import Trigger, { type InputTriggerParams } from './Input/Trigger.mjs';
import type { VirtualDevice } from '../../VirtualDevice.mjs';

export type InputConfig = {
  /**
   * Identifier of the Input component instance
   */
  id: number;
  /**
   * Name of the input instance
   */
  name: string | null;
  /**
   * Type of associated input.
   *
   * Some values are available only if applicable.
   */
  type: 'switch' | 'button' | 'analog' | 'count';
  /**
   * Global enable flag.
   * When disabled, the input instance doesn't emit any events and reports status properties as null.
   *
   * Applies for all input types.
   */
  enable: boolean;
  /**
   * True if the logical state of the associated input is inverted, false otherwise.
   *
   * For the change to be applied, the physical switch has to be toggled once after invert is set.
   * For type analog inverts percent range - 100% becomes 0% and 0% becomes 100%.
   *
   * (only for type `switch`, `button`, `analog`)
   */
  invert?: boolean;
  /**
   * True if input-triggered factory reset option is enabled, false otherwise.
   *
   * (only for type `switch`, `button`)
   */
  factory_reset?: boolean;
  /**
   * Analog input report threshold in percent.
   *
   * The accepted range is device-specific, default [1.0..50.0]% unless specified otherwise
   *
   * (only for type `analog`)
   */
  report_thr?: number;
  /**
   * Remaps 0%-100% range to values in array.
   * The first value in the array is the `min` setting, and the second value is the `max` setting.
   *
   * The accepted range for values is from 0% to 100%.
   * Default values are [0, 100].
   * `max` must be greater than `min`.
   * Equality is supported.
   *
   * (only for type `analog`)
   */
  range_map?: [number, number] | null;
  /**
   * Analog input range, which is device-specific.
   * | range   | 0                 | 1       |
   * | :------ | :---------------  | :------ |
   * | PlusUni | 0-15VDC (default) | 0-30VDC |
   *
   * (only for type `analog`)
   */
  range?: 0 | 1;
  /**
   * Value transformation config for `status.percent`
   *
   * (only for type `analog`)
   */
  xpercent?: {
    /**
     * JS expression containing x,
     * where x is the raw value to be transformed (`status.percent`),
     * for example "x+1".
     *
     * Accepted range: null or [0..100] chars.
     *
     * Both null and "" mean value transformation is disabled.
     */
    expr: string | null;
    /**
     * Unit of the transformed value (`status.xpercent`), for example, "m/s".
     *
     * Accepted range: null or [0..20] chars.
     *
     * Both null and "" mean value transformation is disabled.
     */
    unit: string | null;
  };
  /**
   * Counts report threshold in number of pulses.
   *
   * Accepted range [1 - 2147483647]
   *
   * (only for type `count`)
   */
  count_rep_thr?: number;
  /**
   * Reference time in seconds for base of frequency measurement.
   *
   * Accepted range [1 - 3600]
   *
   * (only for type `count`)
   */
  freq_window?: number;
  /**
   * Frequency report threshold in percent.
   *
   * Accepted range [0 - 10000]
   *
   * (only for type `count`)
   */
  freq_rep_thr?: number;
  /**
   * Value transformation config for `status.counts.total` and `status.counts.by_minute`
   *
   * (only for type `count`)
   */
  xcounts?: {
    /**
     * JS expression containing x,
     * where x is the raw value to be transformed (`status.counts.total` and `status.counts.by_minute`),
     * for example "x+1".
     *
     * Accepted range: null or [0..100] chars.
     *
     * Both null and "" mean value transformation is disabled.
     */
    expr: string | null;
    /**
     * Unit of the transformed values (`status.counts.xtotal` and `status.counts.xby_minute`),
     * for example, "m/s".
     *
     * Accepted range: null or [0..20] chars.
     *
     * Both null and "" mean value transformation is disabled.
     */
    unit: string | null;
  };
  /**
   * Value transformation config for `status.freq`
   * (only for type `count`)
   */
  xfreq?: {
    /**
     * JS expression containing x,
     * where x is the raw value to be transformed (`status.freq`),
     * for example "x+1".
     *
     * Accepted range: null or [0..100] chars.
     *
     * Both null and "" mean value transformation is disabled.
     */
    expr: string | null;
    /**
     * Unit of the transformed value (`status.xfreq`),
     * for example, "m/s".
     *
     * Accepted range: null or [0..20] chars.
     *
     * Both null and "" mean value transformation is disabled.
     */
    unit: string | null;
  };
};

export type InputStatus = {
  /**
   * Identifier of the Input component instance
   */
  id: number;
  /**
   * State of the input.
   *
   * `null` if the input instance is stateless, i.e. for type `button`.
   *
   * (only for type `switch`, `button`)
   */
  state?: boolean | null;
  /**
   * Analog value in percent.
   *
   * `null` if the valid value could not be obtained.
   *
   * (only for type `analog`)
   */
  percent?: number | null;
  /**
   * `percent` transformed with `config.xpercent.expr`.
   *
   * `null` if `config.xpercent.expr` can not be evaluated.
   *
   * Present only when both `config.xpercent.expr` and `config.xpercent.unit` are set to non-empty values.
   *
   * (only for type `analog`)
   */
  xpercent?: number | null;
  /**
   * Information about the counted pulses.
   *
   * (only for type `count`)
   */
  counts?: {
    // Total pulses counted.
    total: number;
    /**
     * `total` transformed with `config.xcounts.expr`.
     *
     * `null` if `config.xcounts.expr` can not be evaluated.
     *
     * Present only when both `config.xcounts.expr` and `config.xcounts.unit` are set to non-empty values.
     */
    xtotal?: number | null;
    /**
     * Pulse counts for the last three complete minutes.
     *
     * The 0-th element indicates the counts accumulated during the minute preceding `minute_ts`.
     *
     * Present only if the device clock is synced.
     */
    by_minute?: number[];
    /**
     * `by_minute` values transformed with `config.xcounts.expr`.
     *
     * `null` if `config.xcounts.expr` can not be evaluated.
     *
     * Present only when both `config.xcounts.expr` and `config.xcounts.unit` is set to non-empty values
     * and the device clock is synced.
     */
    xby_minute?: number[] | null;
    /**
     * Unix timestamp marking the start of the current minute (in UTC).
     */
    minute_ts: number;
  };
  /**
   * Measured frequency in Hz.
   *
   * Determined at every elapsed `freq_window` period.
   *
   * (only for type `count`)
   */
  freq?: number;
  /**
   * `freq` transformed with `config.xfreq.expr`.
   *
   * `null` if `config.xfreq.expr` can not be evaluated.
   *
   * Present only when both `config.xfreq.expr` and `config.xfreq.unit` are set to non-empty values.
   *
   * (only for type `count`)
   */
  xfreq?: number | null;
  /**
   * Shown only if at least one error is present.
   */
  errors?: ('out_of_range' | 'read')[];
};

export type InputHomeySettings = {
  'Input:type': 'switch' | 'button' | 'analog' | 'count';
  'Input:enable': boolean;
  'Input:invert': boolean;
  'Input:report_thr': number;
  'Input:range_map.min': number;
  'Input:range_map.max': number;
  'Input:range': '0' | '1';
  'Input:count_rep_thr': number;
  'Input:freq_window': number;
  'Input:freq_rep_thr': number;
};

const settingKeys = [
  'type',
  'enable',
  'invert',
  'report_thr',
  'range',
  'count_rep_thr',
  'freq_window',
  'freq_rep_thr',
] as const satisfies (keyof InputConfig)[];

/**
 * The Input component handles the external digital or analog input terminals of a device.
 * Inputs can trigger webhooks, control switches and optionally perform factory reset.
 */
export default class Input extends ComponentWithId<InputStatus, InputConfig, InputHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  readonly namespace = 'Input';
  static uiName = 'Input';

  readonly CheckExpression = CheckExpression;

  async ResetCounters(
    channel: RpcChannel,
    params?: InputResetCountersParams,
  ): Promise<ResponseSuccessFrame<InputResetCountersResponse>> {
    return ResetCounters(channel, this.id, params);
  }

  async Trigger(channel: RpcChannel, params: InputTriggerParams): Promise<ResponseSuccessFrame<null>> {
    return Trigger(channel, this.id, params);
  }

  async register(): Promise<void> {
    return;
  }

  async registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<'Input'>[]): Promise<void> {
    const inputTypes = Input.getInputTypes(homeyDevice.virtualDevice!);
    const sameTypeInputComponents = inputTypes[this.config.type];
    const homeyDeviceInputComponents = sameTypeInputComponents.filter(component =>
      homeyDevice.getTypedStore().components.includes(component),
    );

    // Add helper capability to show correct flows
    if (homeyDeviceInputComponents.length > 1) {
      await homeyDevice.safeAddCapability(`hidden.has_input_multiple_${this.config.type}`);
    } else {
      await homeyDevice.safeAddCapability(`hidden.has_input_${this.config.type}`);
    }
  }

  async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<InputStatus>): Promise<void> {
    if (status.state !== undefined && status.state !== null) {
      const switchUpdate = { value: status.state, switch: this.id };
      await homeyDevice.homey.flow
        .getDeviceTriggerCard('input_switch_event')
        .trigger(homeyDevice, switchUpdate, switchUpdate);
      await homeyDevice.homey.flow
        .getDeviceTriggerCard('input_multiple_switch_event')
        .trigger(homeyDevice, switchUpdate, switchUpdate);
    }
  }

  async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: InputConfig): Promise<void> {
    const newSettings: RecursivePartial<InputHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of settingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Input:${settingKey}`] = config[settingKey] as never;
      }
    }

    if (config['range_map'] !== undefined) {
      if (config['range_map'] === null) {
        newSettings['Input:range_map.min'] = 0;
        newSettings['Input:range_map.max'] = 100;
      } else {
        newSettings['Input:range_map.min'] = config['range_map'][0];
        newSettings['Input:range_map.max'] = config['range_map'][1];
      }
    }

    await homeyDevice.setSettings(newSettings);
  }

  async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<InputHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<InputConfig, AllowedPrimitives> = {};

    for (const settingKey of settingKeys) {
      const homeySettingKey = `Input:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (changedKeys.includes('Input:range_map.min') || changedKeys.includes('Input:range_map.max')) {
      changedConfig['range_map'] = [newSettings['Input:range_map.min'], newSettings['Input:range_map.max']];
    }

    if (Object.keys(changedConfig).length > 0) {
      const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
      return result.result.restart_required;
    } else {
      return false;
    }
  }

  async handleEvent(event: NotificationEventParam): Promise<void> {
    if (['btn_down', 'btn_up', 'single_push', 'double_push', 'triple_push', 'long_push'].includes(event.event)) {
      this.device.log('Button event:', event.event);
      // TODO
    } else {
      await super.handleEvent(event);
    }
  }

  /**
   * A utility function outside the RPC spec to collect all components configured to each type for a Shelly device.
   */
  static getInputTypes(virtualDevice: VirtualDevice): Record<InputConfig['type'], string[]> {
    const types: Record<InputConfig['type'], string[]> = {
      switch: [],
      button: [],
      analog: [],
      count: [],
    };

    for (const [componentId, component] of virtualDevice.virtualComponents.entries()) {
      if (component instanceof Input) {
        types[component.config.type].push(componentId);
      }
    }

    return types;
  }
}
