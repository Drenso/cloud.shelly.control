import { ComponentWithId } from '../Component.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import SetConfig from './Number/SetConfig.js';
import GetConfig from './Number/GetConfig.js';
import GetStatus from './Number/GetStatus.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import Set, { type NumberSetParams } from './Number/Set.js';
import type { JsonObject } from '../../../types/json.js';
import { safeTriggerDeviceCard } from '../../safeFunctions.js';
import type ShellyApp from '../../../app.js';
import { fillTranslationTagsRecursively, translate } from '../../util.js';
import capabilitiesOptions from './Number/capabilitiesOptions.json' with { type: 'json' };

export type NumberConfig = {
  /** Identifier of the Number component instance */
  id: number;
  /**
   * Name of the Number instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  /** Whether the value should persist */
  persisted: boolean;
  /** Value applied on reboot if `persisted` is false */
  default_value: number;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  meta: null | {
    cloud?: ['measurement', 'log'];
    ui: {
      /**
       * How the number should be shown in the ui.
       *
       * Empty string for hidden.
       */
      view: '' | 'field' | 'slider' | 'progressbar' | 'label';
      step: number;
      unit: string;
      icon?: string | null;
    };
  };
  /** The component that controls the value of this virtual component */
  owner?: string;
  /** Access flags, consisting of c, r(ead), and w(rite) */
  access?: string;
};

export type NumberStatus = {
  /** Source of the last command */
  source: string;
  value: number;
  /** Unix timestamp for the last value update */
  last_update_ts: number;
};

export type NumberHomeySettings = Record<never, never>;

/**
 * The virtual Number component is used to store a true/false value.
 */
export default class Number extends ComponentWithId<'Number', NumberStatus, NumberConfig, NumberHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Number';
  public static readonly uiName = 'Number';

  public async Set(channel: RpcChannel, params: NumberSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Number'>[],
  ): Promise<void> {
    const homeyCapability = 'virtual_number';
    const capabilityOptions: JsonObject = {
      title: this.getTitleTranslations(),
      min: this.config.min,
      max: this.config.max,
    };
    const meta = this.config.meta;

    if (this.config.access !== undefined) {
      if (this.config.access !== '*' && !this.config.access.includes('w')) {
        capabilityOptions.uiComponent = 'sensor';
        capabilityOptions.setable = 'false';
      }
    }

    if (meta !== null) {
      capabilityOptions.units = meta.ui.unit;
      capabilityOptions.step = meta.ui.step;
      if (meta.ui.view === '') {
        capabilityOptions.uiComponent = null;
      }
    }

    await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, async (value: number) => {
      await this.Set(this.device.getChannel(), { value });
    });
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await Number.unregisterCapability(homeyDevice, 'virtual_number', id);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<NumberStatus>): Promise<void> {
    if (status.value !== undefined) {
      await this.setCapability(homeyDevice, 'virtual_number', status.value);
      await safeTriggerDeviceCard(
        homeyDevice,
        'virtual_number_changed',
        { id: this.id, value: status.value },
        { id: this.id },
      );
    }
  }

  public getTitleTranslations(): string | { en: string; [p: string]: string } {
    if (this.config.name !== null) {
      return this.config.name;
    }
    return fillTranslationTagsRecursively(capabilitiesOptions['numberName'], {
      name: `${this.id}`,
    }) as string | { en: string; [p: string]: string };
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: NumberConfig): Promise<void> {}

  public static registerFlowCards(app: ShellyApp): void {
    const getNumbers = (device: ShellyLocalDevice): Number[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      return [...device.virtualComponents.values()].filter(component => component instanceof Number);
    };

    const autoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      return getNumbers(device)
        .map(number => ({
          name: translate(app.homey.__('locale'), number.getTitleTranslations()),
          id: number.id,
        }))
        .filter(number => number.name.toLowerCase().includes(query.toLowerCase()));
    };

    app.homey.flow
      .getDeviceTriggerCard('virtual_number_changed')
      .registerArgumentAutocompleteListener('number', autoCompleteListener)
      .registerRunListener((cardArgs: { number: { name: string; id: number } }, triggerArgs: { id: number }) => {
        return cardArgs.number.id === triggerArgs.id;
      });

    app.homey.flow
      .getActionCard('set_virtual_number')
      .registerArgumentAutocompleteListener('number', autoCompleteListener)
      .registerRunListener(
        (cardArgs: { device: ShellyLocalDevice; number: { name: string; id: number }; value: number }) => {
          const componentKey = `number:${cardArgs.number.id}`;
          const component = cardArgs.device.virtualComponents.get(componentKey) as Number | undefined;
          if (component === undefined) {
            throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
          }
          const channel = cardArgs.device.virtualDevice?.getChannel();
          if (channel === undefined) {
            throw new Error(app.homey.__('error.host_unreachable'));
          }
          return component.Set(channel, { value: cardArgs.value });
        },
      );
  }
}
