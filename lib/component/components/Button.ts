import { ComponentWithId } from '../Component.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import SetConfig from './Button/SetConfig.js';
import GetConfig from './Button/GetConfig.js';
import GetStatus from './Button/GetStatus.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import Trigger, { type ButtonTriggerParams } from './Button/Trigger.js';
import type { JsonObject } from '../../../types/json.js';
import { createMitt, fillTranslationTagsRecursively, translate } from '../../util.js';
import capabilitiesOptions from './Button/capabilitiesOptions.json' with { type: 'json' };
import type ShellyApp from '../../../app.js';
import type { NotificationEventParam } from '../../rpc/Rpc.js';
import { safeTriggerDeviceCard } from '../../safeFunctions.js';

export type ButtonConfig = {
  /** Identifier of the Button component instance */
  id: number;
  /**
   * Name of the Button instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  meta: null | {
    ui: {
      /**
       * How the button should be shown in the ui.
       *
       * Empty string for hidden.
       */
      view: '' | 'button';
      /**
       * Url to custom icon
       */
      icon?: null | string;
    };
  };
  /** The component that controls the value of this virtual component */
  owner?: string;
  /** Access flags, consisting of c, r(ead), and w(rite) */
  access?: string;
};

export type ButtonStatus = {
  /** Identifier of the Button component instance */
  id: number;
};

export type ButtonHomeySettings = Record<never, never>;

type ButtonMittEvents = {
  event: 'single_push' | 'double_push' | 'triple_push' | 'long_push';
};

/**
 * The virtual Button component is used to store a true/false value.
 */
export default class Button extends ComponentWithId<'Button', ButtonStatus, ButtonConfig, ButtonHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Button';
  public static readonly uiName = 'Button';

  private readonly buttonMitt = createMitt<ButtonMittEvents>();

  public async Trigger(channel: RpcChannel, params: ButtonTriggerParams): ReturnType<typeof Trigger> {
    return Trigger(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Button'>[],
  ): Promise<void> {
    const homeyCapability = 'virtual_button';
    const capabilityOptions: JsonObject = {
      title: this.getTitleTranslations(),
    };
    const meta = this.config.meta;

    if (meta !== null) {
      if (meta.ui.view === '') {
        capabilityOptions.uiComponent = null;
      }
    }

    await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, async (_value: boolean) => {
      await this.Trigger(this.device.getChannel(), { event: 'single_push' });
    });

    this.buttonMitt.on('event', event => {
      safeTriggerDeviceCard(
        homeyDevice,
        'virtual_button_triggered',
        { id: this.id, event: event },
        { id: this.id, event: event },
      );
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
    await Button.unregisterCapability(homeyDevice, 'virtual_button', id);
  }

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    if (['single_push', 'double_push', 'triple_push', 'long_push'].includes(event.event)) {
      this.buttonMitt.emit('event', event.event as 'single_push' | 'double_push' | 'triple_push' | 'long_push');
      return;
    }
    return super.handleEvent(event);
  }

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: Partial<ButtonStatus>): Promise<void> {}

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: ButtonConfig): Promise<void> {}

  public getTitleTranslations(): string | { en: string; [p: string]: string } {
    if (this.config.name !== null) {
      return this.config.name;
    }
    return fillTranslationTagsRecursively(capabilitiesOptions['buttonName'], {
      name: `${this.id}`,
    }) as string | { en: string; [p: string]: string };
  }

  public static registerFlowCards(app: ShellyApp): void {
    const getButtons = (device: ShellyLocalDevice): Button[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      return [...device.virtualComponents.values()].filter(component => component instanceof Button);
    };

    const autoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      return getButtons(device)
        .map(button => ({
          name: translate(app.homey.__('locale'), button.getTitleTranslations()),
          id: button.id,
        }))
        .filter(button => button.name.toLowerCase().includes(query.toLowerCase()));
    };

    app.homey.flow
      .getDeviceTriggerCard('virtual_button_triggered')
      .registerArgumentAutocompleteListener('button', autoCompleteListener)
      .registerRunListener(
        (
          cardArgs: {
            button: { name: string; id: number };
            event: ('single_push' | 'double_push' | 'triple_push' | 'long_push')[];
          },
          triggerArgs: { id: number; event: 'single_push' | 'double_push' | 'triple_push' | 'long_push' },
        ) => {
          return cardArgs.button.id === triggerArgs.id && cardArgs.event.includes(triggerArgs.event);
        },
      );

    app.homey.flow
      .getActionCard('trigger_virtual_button')
      .registerArgumentAutocompleteListener('button', autoCompleteListener)
      .registerRunListener(
        (cardArgs: {
          device: ShellyLocalDevice;
          button: { name: string; id: number };
          event: 'single_push' | 'double_push' | 'triple_push' | 'long_push';
        }) => {
          const buttonComponent = cardArgs.device.virtualComponents.get(`button:${cardArgs.button.id}`) as
            | Button
            | undefined;
          const channel = cardArgs.device.virtualDevice?.getChannel();
          if (buttonComponent !== undefined && channel !== undefined) {
            return buttonComponent.Trigger(channel, { event: cardArgs.event });
          }
        },
      );
  }
}
