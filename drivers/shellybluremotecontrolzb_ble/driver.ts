import ShellyBleDriver from '../../lib/ble/BleDriver.js';

export type Button = 'left' | 'right';
export type ScrollDirection = 'up' | 'down' | 'none';

export default class ShellyBluRemoteControlDriver extends ShellyBleDriver {
  public async onInit(): Promise<void> {
    await super.onInit();

    this.homey.flow
      .getDeviceTriggerCard('blu_remote_control_button_pressed')
      .registerRunListener(
        (cardArgs: { button: Button[]; channel: string[] }, triggerArgs: { button: Button; channel: number }) =>
          cardArgs.button.includes(triggerArgs.button) && cardArgs.channel.includes(triggerArgs.channel.toFixed()),
      );

    this.homey.flow
      .getDeviceTriggerCard('blu_remote_control_rotation_measured')
      .registerRunListener((cardArgs: { channel: string[] }, triggerArgs: { channel: number }) =>
        cardArgs.channel.includes(triggerArgs.channel.toFixed()),
      );

    this.homey.flow
      .getDeviceTriggerCard('blu_remote_control_scrolled')
      .registerRunListener(
        (
          cardArgs: { direction: ScrollDirection[]; channel: string[] },
          triggerArgs: { direction: ScrollDirection; channel: number },
        ) =>
          (triggerArgs.direction === 'none' || cardArgs.direction.includes(triggerArgs.direction)) &&
          cardArgs.channel.includes(triggerArgs.channel.toFixed()),
      );

    this.homey.flow
      .getDeviceTriggerCard('blu_remote_control_scrolling_start')
      .registerRunListener(
        (
          cardArgs: { direction: ScrollDirection[]; channel: string[] },
          triggerArgs: { direction: ScrollDirection; channel: number },
        ) =>
          (triggerArgs.direction === 'none' || cardArgs.direction.includes(triggerArgs.direction)) &&
          cardArgs.channel.includes(triggerArgs.channel.toFixed()),
      );
  }
  public bleNamePrefix = 'SBRC';
}
