import { ComponentWithId } from '../Component.js';
import SetConfig from './Enum/SetConfig.js';
import GetConfig from './Enum/GetConfig.js';
import GetStatus from './Enum/GetStatus.js';
import Set, { type EnumSetParams } from './Enum/Set.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { fillTranslationTagsRecursively, translate } from '../../util.js';
import capabilitiesOptions from './Enum/capabilitiesOptions.json' with { type: 'json' };
import type ShellyApp from '../../../app.js';
import type { JsonObject } from '../../../types/json.js';
import { safeTriggerDeviceCard } from '../../safeFunctions.js';

export type EnumConfig = {
  /** Identifier of the Enum component instance */
  id: number;
  /**
   * Name of the Enum instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  /** Whether the value should persist after reboot */
  persisted: boolean;
  /** Value applied on reboot if `persisted` is false */
  default_value: string | null;
  /**
   * Values that can be set for this enum instance
   *
   * A valid list is required for this component.
   */
  options: string[];
  /** Stores the component's metadata */
  meta: {
    ui: {
      /**
       * How the enum should be shown in the ui.
       *
       * Empty string for hidden.
       */
      view: '' | 'dropdown' | 'label';
      /**
       * A mapping from option keys to user-friendly titles.
       */
      titles: Record<string, string>;
      /**
       * URL to custom icon.
       *
       * Empty string for none.
       */
      icon: string;
      /**
       * A mapping from option keys to custom icon URLs.
       *
       * Only for use when `view` is set to `label`.
       */
      images: Record<string, string | null>;
    };
  } | null;
  /** The component that controls the value of this virtual component */
  owner?: string;
  /** Access flags, consisting of c, r(ead), and w(rite) or `*` for all */
  access?: string;
};

export type EnumStatus = {
  /** Source of the last command */
  source: string;
  value: string | null;
  /** Unix timestamp for the last value update */
  last_update_ts: number;
};

export type EnumHomeySettings = Record<never, never>;

/**
 * The virtual Enum component is used to store a set of constant values.
 */
export default class Enum extends ComponentWithId<'Enum', EnumStatus, EnumConfig, EnumHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Enum';
  public static readonly uiName = 'Enum';
  protected static readonly key = 'enum';

  public async Set(channel: RpcChannel, params: EnumSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, _methods: ComponentMethod<'Enum'>[]): Promise<void> {
    const homeyCapability = 'virtual_enum';
    const options = this.config.options;
    const optionLabels = this.config.meta?.ui.titles ?? {};

    const homeyValues = [];

    for (const option of options) {
      homeyValues.push({
        id: option,
        title: optionLabels[option] ?? option.charAt(0).toUpperCase() + option.slice(1),
      });
    }

    const capabilityOptions: JsonObject = {
      title: this.getTitleTranslations(),
      values: homeyValues,
    };

    if (this.config.access !== undefined) {
      if (this.config.access !== '*' && !this.config.access.includes('w')) {
        capabilityOptions.uiComponent = 'sensor';
        capabilityOptions.setable = 'false';
      }
    }

    if (this.config.meta?.ui.view === '') {
      capabilityOptions.uiComponent = null;
    }

    await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, async (value: string) => {
      await this.Set(this.device.getChannel(), { value });
    });
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await Enum.unregisterCapability(homeyDevice, 'virtual_enum', id);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<EnumStatus>): Promise<void> {
    if (status.value !== undefined) {
      await this.setCapability(homeyDevice, 'virtual_enum', status.value);
      await safeTriggerDeviceCard(
        homeyDevice,
        'virtual_enum_changed',
        { id: this.id, value: status.value },
        { id: this.id },
      );
    }
  }

  public getTitleTranslations(): string | { en: string; [p: string]: string } {
    if (this.config.name !== null) {
      return this.config.name;
    }
    return fillTranslationTagsRecursively(capabilitiesOptions['enumName'], {
      name: `${this.id}`,
    }) as string | { en: string; [p: string]: string };
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: EnumConfig): Promise<void> {}

  public static registerFlowCards(app: ShellyApp): void {
    const getEnums = (device: ShellyLocalDevice): Enum[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      return [...device.virtualComponents.values()].filter(component => component instanceof Enum);
    };

    const componentAutoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      return getEnums(device)
        .map(enumComponent => ({
          name: translate(app.homey.__('locale'), enumComponent.getTitleTranslations()),
          id: enumComponent.id,
        }))
        .filter(enumComponent => enumComponent.name.toLowerCase().includes(query.toLowerCase()));
    };

    const valueAutoCompleteListener = (
      query: string,
      cardArgs: { device: ShellyLocalDevice; enum: { name: string; id: number } },
    ): { name: string; id: string }[] => {
      if (cardArgs.enum === undefined) {
        return [];
      }
      const componentKey = `${Enum.key}:${cardArgs.enum.id}`;
      const component = cardArgs.device.virtualComponents.get(componentKey) as Enum | undefined;
      if (component === undefined) {
        throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
      }

      const options = component.config.options;
      const optionLabels = component.config.meta?.ui.titles ?? {};

      const homeyValues = [];

      for (const option of options) {
        homeyValues.push({
          id: option,
          name: optionLabels[option] ?? option.charAt(0).toUpperCase() + option.slice(1),
        });
      }

      return homeyValues;
    };

    app.homey.flow
      .getDeviceTriggerCard('virtual_enum_changed')
      .registerArgumentAutocompleteListener('enum', componentAutoCompleteListener)
      .registerRunListener((cardArgs: { enum: { name: string; id: number } }, triggerArgs: { id: number }) => {
        return cardArgs.enum.id === triggerArgs.id;
      });

    app.homey.flow
      .getActionCard('set_virtual_enum')
      .registerArgumentAutocompleteListener('enum', componentAutoCompleteListener)
      .registerArgumentAutocompleteListener('value', valueAutoCompleteListener)
      .registerRunListener(
        (cardArgs: {
          device: ShellyLocalDevice;
          enum: { name: string; id: number };
          value: { name: string; id: string };
        }) => {
          const componentKey = `${Enum.key}:${cardArgs.enum.id}`;
          const component = cardArgs.device.virtualComponents.get(componentKey) as Enum | undefined;
          if (component === undefined) {
            throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
          }
          const channel = cardArgs.device.virtualDevice?.getChannel();
          if (channel === undefined) {
            throw new Error(app.homey.__('error.host_unreachable'));
          }
          return component.Set(channel, { value: cardArgs.value.id });
        },
      );

    app.homey.flow
      .getConditionCard('virtual_enum_is')
      .registerArgumentAutocompleteListener('enum', componentAutoCompleteListener)
      .registerArgumentAutocompleteListener('value', valueAutoCompleteListener)
      .registerRunListener(
        (cardArgs: {
          device: ShellyLocalDevice;
          enum: { name: string; id: number };
          value: { name: string; id: string };
        }) => {
          const componentKey = `${Enum.key}:${cardArgs.enum.id}`;
          const component = cardArgs.device.virtualComponents.get(componentKey) as Enum | undefined;
          if (component === undefined) {
            throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
          }
          const channel = cardArgs.device.virtualDevice?.getChannel();
          if (channel === undefined) {
            throw new Error(app.homey.__('error.host_unreachable'));
          }
          console.log(cardArgs);
          return component.status.value === cardArgs.value.id;
        },
      );
  }
}
