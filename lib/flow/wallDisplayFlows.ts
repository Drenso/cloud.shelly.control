import type ShellyApp from '../../app.js';
import Media, { type MediaControl, type MediaItem } from '../component/components/Media.js';
import WallDisplayUI from '../component/components/WallDisplayUI.js';
import type ShellyLocalDevice from '../local/LocalDevice.js';

function screen(device: ShellyLocalDevice): WallDisplayUI {
  const component = device.virtualComponents.get('ui');
  if (!(component instanceof WallDisplayUI)) {
    throw new Error(device.homey.__('error.component_not_found', { component: 'ui' }));
  }
  return component;
}

function media(device: ShellyLocalDevice): Media {
  const component = device.virtualComponents.get('media');
  if (!(component instanceof Media)) {
    throw new Error(device.homey.__('error.component_not_found', { component: 'media' }));
  }
  return component;
}

export function registerWallDisplayFlowCards(app: ShellyApp): void {
  app.homey.flow
    .getActionCard('wall_display_screen')
    .registerRunListener(async ({ device, on }: { device: ShellyLocalDevice; on: boolean }) => {
      await screen(device).setScreen(on);
    });
  app.homey.flow
    .getActionCard('wall_display_brightness')
    .registerRunListener(async ({ device, brightness }: { device: ShellyLocalDevice; brightness: number }) => {
      const component = screen(device);
      await component.setBrightness(brightness);
      await component.onConfigUpdate(device, component.config);
    });
  app.homey.flow
    .getActionCard('wall_display_volume')
    .registerRunListener(async ({ device, volume }: { device: ShellyLocalDevice; volume: number }) => {
      const component = media(device);
      await component.setVolume(volume / 100);
      await component.refreshStatus(device);
    });
  app.homey.flow
    .getActionCard('wall_display_media_control')
    .registerRunListener(async ({ device, action }: { device: ShellyLocalDevice; action: MediaControl }) => {
      const component = media(device);
      await component.control(action);
      await component.refreshStatus(device);
    });
  for (const [cardId, radio] of [
    ['wall_display_play_sound', false],
    ['wall_display_play_radio', true],
  ] as const) {
    app.homey.flow
      .getActionCard(cardId)
      .registerArgumentAutocompleteListener(
        'item',
        async (query: string, { device }: { device: ShellyLocalDevice }) => {
          const items = await media(device).listItems(radio);
          return items
            .map(item => ({
              id: item.id,
              name: item.title || item.name || item.filename || String(item.id),
              type: item.type,
            }))
            .filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()));
        },
      )
      .registerRunListener(async ({ device, item }: { device: ShellyLocalDevice; item: MediaItem }) => {
        const component = media(device);
        await component.playItem(item, radio);
        await component.refreshStatus(device);
      });
  }
}
