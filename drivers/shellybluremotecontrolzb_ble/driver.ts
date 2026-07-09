import ShellyBleDriver from '../../lib/ble/BleDriver.js';

export type Button = 'left' | 'right';
export type ScrollDirection = 'up' | 'down' | 'none';

export default class ShellyBluRemoteControlDriver extends ShellyBleDriver {
  public async onInit(): Promise<void> {
    await super.onInit();

    this.homey.flow
      .getDeviceTriggerCard('blu_remote_control_button_pressed')
      .registerRunListener((cardArgs: { button: Button[] }, triggerArgs: { button: Button }) => {
        return cardArgs.button.includes(triggerArgs.button);
      });

    this.homey.flow
      .getDeviceTriggerCard('blu_remote_control_scrolled')
      .registerRunListener(
        (cardArgs: { direction: ScrollDirection[] }, triggerArgs: { direction: ScrollDirection }) => {
          return triggerArgs.direction === 'none' || cardArgs.direction.includes(triggerArgs.direction);
        },
      );

    this.homey.flow
      .getDeviceTriggerCard('blu_remote_control_scrolling_start')
      .registerRunListener(
        (cardArgs: { direction: ScrollDirection[] }, triggerArgs: { direction: ScrollDirection }) => {
          return triggerArgs.direction === 'none' || cardArgs.direction.includes(triggerArgs.direction);
        },
      );
  }
  public bleNamePrefix = 'SBRC';
}
