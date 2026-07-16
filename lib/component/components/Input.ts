import {
  safeAddCapability,
  safeRemoveCapability,
  safeSetCapabilityValue,
  safeTriggerDeviceCard,
} from '../../safeFunctions.js';
import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { createMitt, fillTranslationTagsRecursively, type RecursivePartial, translate } from '../../util.js';
import SetConfig from './Input/SetConfig.js';
import GetConfig from './Input/GetConfig.js';
import GetStatus from './Input/GetStatus.js';
import CheckExpression from './Input/CheckExpression.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type { InputResetCountersParams, InputResetCountersResponse } from './Input/ResetCounters.js';
import ResetCounters from './Input/ResetCounters.js';
import type { NotificationEventParam, ResponseSuccessFrame } from '../../rpc/Rpc.js';
import Trigger, { type InputTriggerParams } from './Input/Trigger.js';
import type { VirtualDevice } from '../../VirtualDevice.js';
import type ShellyApp from '../../../app.js';
import capabilitiesOptions from './Input/capabilitiesOptions.json' with { type: 'json' };
import type { JsonObject } from '../../../types/json.js';

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

const BUTTON_EVENTS = ['btn_down', 'btn_up', 'single_push', 'double_push', 'triple_push', 'long_push'] as const;
type ButtonEvent = (typeof BUTTON_EVENTS)[number];

type ButtonMittEvents = {
  button: ButtonEvent;
};

const CAPABILITY_MAPPING = {
  switch: 'shelly_input_switch',
  analog: 'shelly_input_analog',
  count: 'shelly_input_count',
  button: 'BUTTON_TITLE',
} as const satisfies Record<InputConfig['type'], keyof typeof capabilitiesOptions>;

type RateLimitEvent = {
  component: string;
  id: number;
  event: 'rate_limit_exceeded';
  missed_status: number;
  missed_events: number;
  ts: number;
};

/**
 * The Input component handles the external digital or analog input terminals of a device.
 * Inputs can trigger webhooks, control switches, and optionally perform factory reset.
 */
export default class Input extends ComponentWithId<'Input', InputStatus, InputConfig, InputHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Input';
  public static readonly uiName = 'Input';

  public readonly CheckExpression = CheckExpression;

  private readonly buttonMitt = createMitt<ButtonMittEvents>();

  public async ResetCounters(
    channel: RpcChannel,
    params?: InputResetCountersParams,
  ): Promise<ResponseSuccessFrame<InputResetCountersResponse>> {
    return ResetCounters(channel, this.id, params);
  }

  public async Trigger(channel: RpcChannel, params: InputTriggerParams): Promise<ResponseSuccessFrame<null>> {
    return Trigger(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Input'>[],
  ): Promise<void> {
    const inputTypeComponents = Input.getInputTypes(homeyDevice.virtualDevice!);

    // Migrations to remove old sub-capabilities
    // todo: Remove in 1.0
    {
      for (const capability of [
        'sensor_boolean.input_switch',
        'sensor_number.input_analog',
        'sensor_number.input_count',
      ]) {
        await safeRemoveCapability(homeyDevice, `${capability}.${this.id}`);
      }

      for (const inputType of ['switch', 'button', 'analog', 'count'] as const) {
        await safeRemoveCapability(homeyDevice, `hidden.has_input_multiple_${inputType}`);
      }
    }

    // Go through all types so capabilities for types that are no longer used also get cleaned up.
    // On subsequent Input components this does not cost much due to the hasCapability checks in safeAddCapability and safeRemoveCapability.
    for (const inputType of ['switch', 'button', 'analog', 'count'] as const) {
      const components = inputTypeComponents[inputType] ?? [];
      const homeyDeviceInputComponents = components.filter(component =>
        homeyDevice.getTypedStore().components.includes(component),
      );

      if (homeyDeviceInputComponents.length === 0) {
        await safeRemoveCapability(homeyDevice, `hidden.has_input_${inputType}`);
        const capabilityId = `${CAPABILITY_MAPPING[inputType]}.${this.id}`;
        await safeRemoveCapability(homeyDevice, capabilityId);
        await homeyDevice.setCapabilityOptions(capabilityId, {});
        continue;
      }

      // Add helper capability to show correct flows
      await safeAddCapability(homeyDevice, `hidden.has_input_${inputType}`);

      if (['switch', 'analog', 'count'].includes(inputType)) {
        const homeyCapability = CAPABILITY_MAPPING[inputType as 'switch' | 'analog' | 'count'];
        await this.registerInputCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability]);
      }
    }

    this.buttonMitt.on('button', type => {
      const buttonUpdate = { value: type, input: this.id };
      safeTriggerDeviceCard(homeyDevice, 'input_button_event', buttonUpdate, buttonUpdate);
    });
  }

  public async unregisterHomeyDevice(homeyDevice: ShellyLocalDevice): Promise<void> {
    this.buttonMitt.all.clear();
    await this.staticallyUnregisterHomeyDevice.call(undefined as never, homeyDevice, this.id);
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    for (const type of ['switch', 'button', 'analog', 'count'] as const) {
      await safeRemoveCapability(homeyDevice, `hidden.has_input_${type}`);

      const capabilityId = `${CAPABILITY_MAPPING[type]}.${id}`;
      await safeRemoveCapability(homeyDevice, capabilityId);
      await homeyDevice.setCapabilityOptions(capabilityId, {});
    }

    // Migrations to remove old sub-capabilities
    // todo: Remove in 1.0
    {
      for (const capability of [
        'sensor_boolean.input_switch',
        'sensor_number.input_analog',
        'sensor_number.input_count',
      ]) {
        await safeRemoveCapability(homeyDevice, `${capability}.${id}`);
      }

      for (const inputType of ['switch', 'button', 'analog', 'count'] as const) {
        await safeRemoveCapability(homeyDevice, `hidden.has_input_multiple_${inputType}`);
      }
    }
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<InputStatus>): Promise<void> {
    if (status.state !== undefined && status.state !== null) {
      await this.setInputCapability(homeyDevice, 'input_switch', status.state);
      const switchUpdate = { value: status.state, input: this.id };
      await safeTriggerDeviceCard(homeyDevice, 'input_switch_changed', switchUpdate, switchUpdate);
    }

    if (status.percent !== undefined) {
      await this.setInputCapability(homeyDevice, 'input_analog', status.percent);
      if (status.percent === null) {
        const analogUpdate = { input: this.id };
        await safeTriggerDeviceCard(homeyDevice, 'input_analog_became_null', analogUpdate, analogUpdate);
      } else {
        const analogUpdate = { value: status.percent, input: this.id };
        await safeTriggerDeviceCard(homeyDevice, 'input_analog_changed', analogUpdate, analogUpdate);
      }
    }

    if (status.counts !== undefined) {
      await this.setInputCapability(homeyDevice, 'input_count', status.counts.total);
      const countUpdate = { value: status.counts.total, input: this.id };
      await safeTriggerDeviceCard(homeyDevice, 'input_count_changed', countUpdate, countUpdate);
    }
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: InputConfig): Promise<void> {
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

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
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

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    if (BUTTON_EVENTS.includes(event.event as never)) {
      this.buttonMitt.emit('button', event.event as ButtonEvent);
    }
    if (event.event === 'rate_limit_exceeded') {
      const rateLimitEvent = event as RateLimitEvent;
      this.device.error(
        `[Input:${this.id}]`,
        'Rate limit exceeded. Missed',
        rateLimitEvent.missed_status,
        'status updates and',
        rateLimitEvent.missed_events,
        'events',
      );
    } else {
      await super.handleEvent(event);
    }
  }

  private async registerInputCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    rawCapabilityOptions: JsonObject | undefined,
  ): Promise<string> {
    const capabilityId = `${homeyCapability}.${this.id}`;
    await safeAddCapability(homeyDevice, capabilityId);
    if (rawCapabilityOptions === undefined) {
      return capabilityId;
    }
    const name = this.config.name !== null ? this.config.name : `${this.id}`;
    const capabilityOptions = fillTranslationTagsRecursively(rawCapabilityOptions, {
      name: name,
    }) as JsonObject;
    await homeyDevice.setCapabilityOptions(capabilityId, capabilityOptions);
    return capabilityId;
  }

  private async setInputCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    value: unknown,
  ): Promise<void> {
    const capabilityId = `${homeyCapability}.${this.id}`;
    await safeSetCapabilityValue(homeyDevice, capabilityId, value);
  }

  /**
   * A utility function outside the RPC spec to collect all components configured to each type for a Shelly device.
   */
  public static getInputTypes(virtualDevice: VirtualDevice): Record<InputConfig['type'], string[]> {
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

  public static registerFlowCards(app: ShellyApp): void {
    const createAutocompleteListener = (inputType: InputConfig['type']) => {
      return (
        query: string,
        { device }: { value: boolean; device: ShellyLocalDevice },
      ): { name: string; id: number }[] => {
        if (device.virtualDevice === undefined) {
          return [];
        }

        const switchInputs = Input.getInputTypes(device.virtualDevice)[inputType];

        const deviceSwitchInputs: Input[] = [];
        for (const inputId of switchInputs) {
          const inputComponent = device.virtualComponents.get(inputId) as Input | undefined;
          if (inputComponent !== undefined) {
            deviceSwitchInputs.push(inputComponent);
          }
        }
        const capabilityOptions = capabilitiesOptions[CAPABILITY_MAPPING[inputType]];
        return deviceSwitchInputs.map(input => ({
          name:
            input.config.name ?? translate(app.homey.__('locale'), capabilityOptions.title, { number: `${input.id}` }),
          id: input.id,
        }));
      };
    };

    app.homey.flow
      .getDeviceTriggerCard('input_switch_changed')
      .registerArgumentAutocompleteListener('input', createAutocompleteListener('switch'))
      .registerRunListener(
        (
          flowArgs: { value: ('on' | 'off')[]; input: { id: number } },
          triggerArgs: { value: boolean; input: number },
        ) => {
          const switchMatches = flowArgs.input.id === triggerArgs.input;
          const stateMatches = flowArgs.value.includes(triggerArgs.value ? 'on' : 'off');
          return switchMatches && stateMatches;
        },
      );

    app.homey.flow
      .getDeviceTriggerCard('input_analog_changed')
      .registerArgumentAutocompleteListener('input', createAutocompleteListener('analog'))
      .registerRunListener((flowArgs: { input: { id: number } }, triggerArgs: { value: boolean; input: number }) => {
        return flowArgs.input.id === triggerArgs.input;
      });

    app.homey.flow
      .getDeviceTriggerCard('input_analog_became_null')
      .registerArgumentAutocompleteListener('input', createAutocompleteListener('analog'))
      .registerRunListener((flowArgs: { input: { name: string; id: number } }, triggerArgs: { input: number }) => {
        return flowArgs.input.id === triggerArgs.input;
      });

    app.homey.flow
      .getDeviceTriggerCard('input_count_changed')
      .registerArgumentAutocompleteListener('input', createAutocompleteListener('count'))
      .registerRunListener((flowArgs: { input: { name: string; id: number } }, triggerArgs: { input: number }) => {
        return flowArgs.input.id === triggerArgs.input;
      });

    app.homey.flow
      .getDeviceTriggerCard('input_button_event')
      .registerArgumentAutocompleteListener('input', createAutocompleteListener('button'))
      .registerRunListener(
        (
          flowArgs: {
            value: ('btn_down' | 'btn_up' | 'single_push' | 'double_push' | 'triple_push' | 'long_push')[];
            input: { id: number };
          },
          triggerArgs: {
            value: 'btn_down' | 'btn_up' | 'single_push' | 'double_push' | 'triple_push' | 'long_push';
            input: number;
          },
        ) => {
          const switchMatches = flowArgs.input.id === triggerArgs.input;
          const stateMatches = flowArgs.value.includes(triggerArgs.value);
          return switchMatches && stateMatches;
        },
      );

    app.homey.flow
      .getConditionCard('input_analog_is_null')
      .registerArgumentAutocompleteListener('input', createAutocompleteListener('analog'))
      .registerRunListener((cardArgs: { device: ShellyLocalDevice; input: { name: string; id: number } }) => {
        const componentKey = `input:${cardArgs.input.id}`;
        const component = cardArgs.device.virtualComponents.get(componentKey) as Input | undefined;
        if (component === undefined) {
          throw new Error(cardArgs.device.homey.__('error.component_not_found', { component: componentKey }));
        }
        return component.status.percent === null;
      });

    app.homey.flow
      .getConditionCard('input_switch_is')
      .registerArgumentAutocompleteListener('input', createAutocompleteListener('switch'))
      .registerRunListener((cardArgs: { device: ShellyLocalDevice; input: { name: string; id: number } }) => {
        const componentKey = `input:${cardArgs.input.id}`;
        const component = cardArgs.device.virtualComponents.get(componentKey) as Input | undefined;
        if (component === undefined) {
          throw new Error(cardArgs.device.homey.__('error.component_not_found', { component: componentKey }));
        }
        return component.status.state;
      });
  }
}
