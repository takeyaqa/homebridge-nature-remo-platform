import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { NatureRemoPlatform } from './platform';

export class NatureNemoTvAccessory {
  private readonly service: Service;
  private readonly televisionSpeakerService: Service;
  private readonly name: string;
  private readonly id: string;

  private state = {
    active: this.platform.Characteristic.Active.INACTIVE,
    activeIdentifier: 1,
    mute: false,
  };

  constructor(
    private readonly platform: NatureRemoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.name = this.accessory.context.appliance.nickname;
    this.id = this.accessory.context.appliance.id;

    this.accessory.category = this.platform.api.hap.Categories.TELEVISION;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.appliance.model.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.appliance.model.name)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.accessory.context.appliance.device.firmware_version)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.id)
      .setCharacteristic(this.platform.Characteristic.Name, this.name);

    this.service
      = this.accessory.getService(this.platform.Service.Television) || this.accessory.addService(this.platform.Service.Television);
    this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, this.name);
    this.service.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onGet(this.getActiveIdentifier.bind(this))
      .onSet(this.setActiveIdentifier.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.RemoteKey)
      .onSet(this.setRemoteKey.bind(this));

    this.televisionSpeakerService =
    this.accessory.getService(this.platform.Service.TelevisionSpeaker)
      || this.accessory.addService(this.platform.Service.TelevisionSpeaker);
    this.televisionSpeakerService.setCharacteristic(this.platform.Characteristic.VolumeControlType,
      this.platform.Characteristic.VolumeControlType.RELATIVE);
    this.televisionSpeakerService.getCharacteristic(this.platform.Characteristic.Mute)
      .onGet(this.getMute.bind(this))
      .onSet(this.setMute.bind(this));
    this.televisionSpeakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector)
      .onSet(this.setVolumeSelector.bind(this));

    this.platform.logger.debug('[%s] id -> %s', this.name, this.id);
  }

  async getActive(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getActive called');
    return this.state.active;
  }

  async setActive(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setActive called ->', value);
    if (typeof value !== 'number') {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
    if (value === this.state.active) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      return;
    }
    await this.platform.natureRemoApi.setTvButton(this.id, 'power');
    this.platform.logger.info('[%s] Active <- %s', this.name, value);
    this.state.active = value;
  }

  async getActiveIdentifier(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getAgetActiveIdentifierctive called');
    return this.state.activeIdentifier;
  }

  async setActiveIdentifier(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setActiveIdentifier called ->', value);
    if (typeof value !== 'number') {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
    if (value === this.state.activeIdentifier) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      return;
    }
    this.state.activeIdentifier = value;
  }

  async setRemoteKey(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setRemoteKey called ->', value);
    await this.platform.natureRemoApi.setTvButton(this.id, this.convertRemoteKey(value));
    this.platform.logger.info('[%s] Remote Key <- %s', this.name, value);
  }

  async getMute(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getMute called');
    return this.state.mute;
  }

  async setMute(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setMute called ->', value);
    if (typeof value !== 'boolean') {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
    if (value === this.state.mute) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      return;
    }
    await this.platform.natureRemoApi.setTvButton(this.id, 'mute');
    this.platform.logger.info('[%s] Mute <- %s', this.name, value);
    this.state.mute = value;
  }

  async setVolumeSelector(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setVolumeSelector called ->', value);
    await this.platform.natureRemoApi.setTvButton(this.id, this.convertVolumeSelector(value));
    this.platform.logger.info('[%s] VolumeSelector <- %s', this.name, value);
  }

  private convertRemoteKey(value: CharacteristicValue): string {
    switch (value) {
      case this.platform.Characteristic.RemoteKey.REWIND:
        return 'fast-rewind';
      case this.platform.Characteristic.RemoteKey.FAST_FORWARD:
        return 'fast-forward';
      case this.platform.Characteristic.RemoteKey.NEXT_TRACK:
        return 'next';
      case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK:
        return 'prev';
      case this.platform.Characteristic.RemoteKey.ARROW_UP:
        return 'up';
      case this.platform.Characteristic.RemoteKey.ARROW_DOWN:
        return 'down';
      case this.platform.Characteristic.RemoteKey.ARROW_LEFT:
        return 'left';
      case this.platform.Characteristic.RemoteKey.ARROW_RIGHT:
        return 'right';
      case this.platform.Characteristic.RemoteKey.SELECT:
        return 'ok';
      case this.platform.Characteristic.RemoteKey.BACK:
        return 'back';
      case this.platform.Characteristic.RemoteKey.EXIT:
        return 'back';
      case this.platform.Characteristic.RemoteKey.PLAY_PAUSE:
        return 'play';
      case this.platform.Characteristic.RemoteKey.INFORMATION:
        return 'display';
      default:
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
  }

  private convertVolumeSelector(value: CharacteristicValue): string {
    if (value === this.platform.Characteristic.VolumeSelector.INCREMENT) {
      return 'vol-up';
    } else if (value === this.platform.Characteristic.VolumeSelector.DECREMENT) {
      return 'vol-down';
    } else {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
  }
}
