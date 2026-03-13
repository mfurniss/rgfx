# Security Policy

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, use [GitHub's private vulnerability reporting](https://github.com/mfurniss/rgfx/security/advisories/new).

Include as much detail as possible:

- Description of the vulnerability
- Steps to reproduce
- Which component is affected (Hub, ESP32 Driver, MAME scripts)
- Potential impact
- Suggested fix (if any)

You will receive a response within 7 days.

## Scope

The following components are in scope:

- **RGFX Hub** - Electron application (network services, MQTT broker, file handling)
- **ESP32 Driver Firmware** - Network services, OTA updates, web configuration portal
- **MAME Lua Scripts** - File I/O, event logging

## Security Best Practices for Users

- Keep your RGFX Hub and Driver firmware up to date
- Run the MQTT broker on a trusted local network
- Do not expose RGFX network services to the public internet
- Use OTA updates only on trusted networks
