# Homebridge Nature Remo Platform

[![npm](https://badgen.net/npm/v/@takeya0x86/homebridge-nature-remo-platform?icon=npm&label)](https://www.npmjs.com/package/@takeya0x86/homebridge-nature-remo-platform)
[![Build and Lint](https://github.com/takeya0x86/homebridge-nature-remo-platform/actions/workflows/build.yml/badge.svg)](https://github.com/takeya0x86/homebridge-nature-remo-platform/actions/workflows/build.yml)

Homebridge plugin for Nature Remo which supports lights and air conditioners. **This plugin is unofficial.**

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

## Changelog

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