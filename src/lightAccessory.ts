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
    this.name = this.accessory.context.appliance.nickname;
    this.id = this.accessory.context.appliance.id;

    this.accessory.category = this.platform.api.hap.Categories.LIGHTBULB;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.appliance.model.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.appliance.model.name)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.accessory.context.appliance.device.firmware_version)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.id)
      .setCharacteristic(this.platform.Characteristic.Name, this.name);

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));

    this.platform.logger.debug('[%s] id -> %s', this.name, this.id);
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getOn called');
    const lightState = await this.platform.natureRemoApi.getLightState(this.id);
    this.platform.logger.info('[%s] Power -> %s', this.name, lightState.power);
    return lightState.power === 'on';
  }

  async setOn(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setOn called ->', value);
    if (typeof value !== 'boolean') {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
    const power = value ? 'on' : 'off';
    await this.platform.natureRemoApi.setLight(this.id, power);
    this.platform.logger.info('[%s] Power <- %s', this.name, power);
  }
}
