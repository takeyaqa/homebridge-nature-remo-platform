# Homebridge Nature Remo Platform

[![npm](https://badgen.net/npm/v/@takeya0x86/homebridge-nature-remo-platform?icon=npm&label)](https://www.npmjs.com/package/@takeya0x86/homebridge-nature-remo-platform)
[![Build and Lint](https://github.com/takeya0x86/homebridge-nature-remo-platform/actions/workflows/build.yml/badge.svg)](https://github.com/takeya0x86/homebridge-nature-remo-platform/actions/workflows/build.yml)

Homebridge plugin for Nature Remo which supports lights, air conditioners and TVs. **This plugin is unofficial.**

## Requirements

* An access token generated from https://developer.nature.global/.

## Installation

1. Search for `@takeya0x86/homebridge-nature-remo-platform` on the plugin screen of [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x).
2. Click `INSTALL`.

## Configuration

1. Input your access token into `Access Token` in config window.
2. Click `SAVE` and restart Homebridge.
3. The plugin detect automatically your Nature Remo devices and configured appliances.

## Supported appliances

### Sensors (Nature Remo built-in)

* Temperature
* Humidity
* Illuminance

### Lights

Allows for on/off controls.

### Air conditioners

Allows for on/off, temperature and mode changing controls. The mode changing only supports heating and cooling. Auto, dehumidification, blowing and any other mode are not supported.

### TVs

Allows for on/off and volume controls.

## Changelog

### v2.0.0 (2022-01-01)

- (*New Feature*) Supports TV type appliance.
- (*New Feature*) Add config option which enable to choose appliance type

#### Related pull requests

- [#12](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/12) Refactor API client
- [#13](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/13) Recognize model type by actual sensor data 
- [#14](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/14) Enhance TV type appliance
- [#15](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/15) Update eslint settings
- [#16](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/16) Refactor sensor accessory
- [#17](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/17) Refactor light accessory
- [#18](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/18) Refactor Air Con accessory
- [#19](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/19) Refactor error handling and logger
- [#20](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/20) Add config option
- [#22](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/22) fix component
- [#24](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/24) improve log and axios

### v1.3.0 (2021-12-17)

- [#6](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/6) Repeated serial numbers prevents integration with home assistant -- thanks to [@hekoru](https://github.com/hekoru)
- [#7](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/7) update dependencies

### v1.2.0 (2021-06-21)

- [#3](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/3) Skip Remo-E and Remo-E-lite -- thanks to [@ayame-q](https://github.com/ayame-q)
- [#4](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/4) update dependencies

### v1.1.0 (2021-04-11)

- [#2](https://github.com/takeya0x86/homebridge-nature-remo-platform/pull/2) Support for Remo-mini -- thanks to [@w00kie](https://github.com/w00kie)

### v1.0.0 (2021-02-28)

- First release