import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { NatureRemoPlatform } from './platform';

export class NatureNemoLightAccessory {
  private readonly service: Service;
  private readonly name: string;
  private readonly id: string;

  constructor(
    private readonly platform: NatureRemoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.category = this.platform.api.hap.Categories.LIGHTBULB;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.appliance.model.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.appliance.model.name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.appliance.id)
      .setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.appliance.nickname);

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));

    this.platform.logger.debug('[%s] id -> %s', this.accessory.context.appliance.nickname, this.accessory.context.appliance.id);
    this.name = this.accessory.context.appliance.nickname;
    this.id = this.accessory.context.appliance.id;
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getOn called');
    try {
      const lightState = await this.platform.natureRemoApi.getLightState(this.id);
      this.platform.logger.info('[%s] On -> %s', this.name, lightState.on);
      return lightState.on;
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async setOn(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setOn called ->', value);
    if (typeof value !== 'boolean') {
      throw new Error('value must be a boolean');
    }
    try {
      await this.platform.natureRemoApi.setLight(this.id, value);
      this.platform.logger.info('[%s] On <- %s', this.name, value);
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }
}
