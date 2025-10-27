# RGFX Hub: OTA Updates + Automated WiFi Provisioning - Implementation Plan

**Status:** Planning Complete - Ready for Implementation
**Last Updated:** 2025-01-26
**Target Users:** Home/Maker Users (Commercial enhancements deferred)

---

## Executive Summary

Enable the RGFX Hub to:
1. **Automate WiFi provisioning** - Enter WiFi credentials once, provision unlimited ESP32 devices automatically
2. **Orchestrate OTA updates** - Check for firmware updates, display release notes, update Hub + all Drivers wirelessly

**Key Design Decision:** Leverage existing ESP32 firmware capabilities (ArduinoOTA + serial commands) - **ZERO ESP32 CODE CHANGES REQUIRED!**

---

## Quick Reference

### User Workflows

**Initial Setup (First Device):**
1. Enter WiFi credentials in Hub (one-time)
2. Plug in ESP32 via USB
3. Click "Flash with Saved WiFi"
4. Wait 30 seconds → Device online
5. Configure LEDs → Done!

**Additional Devices:**
1. Plug in ESP32 via USB
2. Click "Flash with Saved WiFi"
3. Wait 30 seconds → Device online
4. Configure LEDs → Done!

**OTA Updates:**
1. Hub notifies "Update available"
2. Click "View Release Notes"
3. Review changes
4. Click "Install Now"
5. Hub updates all Drivers automatically
6. Restart Hub (if updated)

### Security Model (Home Users)

| Component | Security Measure |
|-----------|------------------|
| **Hub Storage** | Encrypted (OS keychain via Electron safeStorage) |
| **USB Transit** | Plain text (physical security sufficient) |
| **ESP32 Storage** | NVS partition (optionally encrypted with flash encryption) |
| **Logging** | Credentials suppressed |
| **Risk Level** | **LOW** - Comparable to Philips Hue, Sonoff, ESPHome, Tasmota |

**Rationale:** Physical USB access required for provisioning. If attacker has physical access, WiFi credentials are the least concern.

---

## Implementation Phases

### Phase 1: WiFi Provisioning (Priority: HIGH)

**Goal:** User can flash multiple ESP32s with cached WiFi credentials

**Components:**

1. **WiFiCredentialStore** (TypeScript class)
   - Save credentials encrypted with `safeStorage`
   - Load credentials (decrypt)
   - Clear credentials
   - File location: `app.getPath('userData')/wifi-config.json`

2. **WiFiSetupDialog** (React component)
   - Input fields: SSID, Password
   - Checkbox: "Save for future devices" (default: checked)
   - Option: "Don't save (enter each time)"
   - Buttons: Continue, Skip (Manual Setup)

3. **SerialProvisioner** (TypeScript class)
   - Open serial port at 115200 baud
   - Wait for device boot message
   - Send `wifi "SSID" "password"` command
   - Wait for confirmation
   - Close serial port

4. **USB Device Detection** (Node.js integration)
   - Monitor USB serial ports (`serialport` library)
   - Detect ESP32 devices (vendor ID: 0x10C4, product ID: 0xEA60 for CP2102)
   - Show notification: "New device detected"

5. **Firmware Flash Integration**
   - Spawn `esptool.py` process
   - Parse progress output
   - Update UI with progress bar
   - Handle errors (flash failed, wrong device, etc.)

6. **DeviceFlashWizard** (React component)
   - Step 1: Device detected
   - Step 2: Flashing firmware (progress bar)
   - Step 3: Provisioning WiFi
   - Step 4: Waiting for connection (mDNS discovery)
   - Step 5: Complete (show device name, IP, "Configure LEDs" button)

7. **Settings Page Enhancement**
   - Display saved SSID (password hidden)
   - "Change WiFi Network" button
   - "Clear Saved Credentials" button
   - Security note: "Credentials encrypted with system keychain"

**Success Criteria:**
- ✅ User enters WiFi once, provisions unlimited devices
- ✅ 30-second setup time per device
- ✅ Credentials encrypted at rest
- ✅ Works with any 2.4GHz WiFi network
- ✅ Error handling (wrong password, connection timeout)

**Testing:**
- Test with saved credentials
- Test without saved credentials (manual setup fallback)
- Test credential clearing
- Test with special characters in SSID/password
- Test with hidden SSID networks

---

### Phase 2: OTA Updates (Priority: MEDIUM)

**Goal:** Hub checks for updates, displays release notes, updates all Drivers wirelessly

**Components:**

1. **GitLab Releases API Client** (TypeScript class)
   - Fetch latest release from GitLab
   - Parse version number (semver)
   - Download release notes (markdown)
   - Download firmware binaries (.bin for Drivers, .dmg/.zip for Hub)
   - Cache in temp directory

2. **UpdateChecker Service** (TypeScript class)
   - Run on Hub startup (configurable: startup/periodic/manual)
   - Compare current Hub version with latest
   - Compare Driver versions with latest (from registry)
   - Trigger notification if updates available
   - Track "skipped versions" (user clicked "Skip This Version")

3. **ReleaseNotesViewer** (React component)
   - Display markdown-formatted release notes
   - Render with `react-markdown` or similar
   - Link to full release notes on GitLab (external browser)
   - Buttons: "Install Now", "View on GitLab", "Skip This Version", "Remind Me Later"

4. **OTAOrchestrator** (TypeScript class)
   - Sequential Driver updates (one at a time)
   - Spawn `espota.py` for each Driver
   - Parse stdout for progress (regex: `/(\d+)%/`)
   - Parse stderr for errors
   - Retry logic (configurable: 0-3 retries)
   - State machine: Queued → Uploading → Verifying → Complete/Failed

5. **ProgressMonitor** (React component)
   - List all Drivers with update status
   - Visual indicators:
     - ⋯ Queued (gray)
     - ⟳ Uploading (blue spinner + progress bar)
     - ✓ Complete (green checkmark)
     - ✗ Failed (red X + error message)
   - Overall progress: "2 of 5 drivers updated"
   - "Cancel Remaining Updates" button
   - Click failed Driver → Show error details
   - "Retry Failed Updates" button

6. **Version Tracking in Driver Registry**
   - Add `firmwareVersion` field to Driver type
   - Drivers report version via:
     - Option A: mDNS TXT record (`version=1.2.3`)
     - Option B: MQTT status message
     - Option C: HTTP endpoint on Driver
   - Display version in Driver list table
   - Highlight outdated Drivers (yellow badge)

7. **Hub Self-Update** (Electron autoUpdater)
   - Use Electron's `autoUpdater` module
   - Download Hub update (.dmg for macOS)
   - Install after Driver updates complete
   - Prompt user: "Restart Now" / "Restart Later"
   - Preserve user settings during update

**Success Criteria:**
- ✅ Update check works on startup
- ✅ Release notes display correctly
- ✅ OTA updates work for all online Drivers
- ✅ Progress monitoring shows real-time status
- ✅ Error handling with clear messages
- ✅ Hub self-updates work reliably

**Testing:**
- Test with single Driver
- Test with multiple Drivers (3+)
- Test with offline Drivers (should skip gracefully)
- Test canceling mid-update
- Test retry after failure
- Test Hub self-update

---

### Phase 3: Documentation & Polish (Priority: MEDIUM)

**Goal:** Comprehensive documentation and polished UI

**Tasks:**

1. **User Documentation**
   - Getting Started guide (first device setup)
   - Adding additional devices
   - Updating firmware (OTA)
   - Troubleshooting guide
   - Security model explanation

2. **Update Local Docs**
   - ✅ ESP32 OTA documentation: [docs/esp32-ota.md](../docs/esp32-ota.md)
   - Add WiFi provisioning guide
   - Add troubleshooting section
   - Add security considerations

3. **UI Polish**
   - Loading states (spinners, skeletons)
   - Error messages (clear, actionable)
   - Success confirmations (toasts, dialogs)
   - Progress animations (smooth transitions)
   - Help tooltips (explain technical terms)
   - Responsive design (resize windows)

4. **Testing with Multiple Devices**
   - Provision 5+ Drivers
   - Update all Drivers simultaneously
   - Test network congestion handling
   - Test recovery from power loss during update
   - Test version mismatches

5. **Beta Release**
   - Internal testing with 3+ users
   - Gather feedback
   - Fix critical bugs
   - Iterate on UX

**Success Criteria:**
- ✅ Documentation covers all workflows
- ✅ UI feels polished and professional
- ✅ Error messages are clear and helpful
- ✅ Testing with 5+ devices successful
- ✅ Beta testers give positive feedback

---

## Technical Details

### WiFi Provisioning

**ESP32 Side (Already Implemented!):**
```cpp
// From esp32/src/main.cpp:295-340
if (cmd.startsWith("wifi ")) {
  String params = cmd.substring(5);
  // Parse SSID and password
  iotWebConf->setWiFiCredentials(ssid, password);
  ESP.restart();
}
```

**Hub Side (New Implementation):**
```typescript
class SerialProvisioner {
  async provisionWiFi(port: string, ssid: string, password: string): Promise<void> {
    const serial = new SerialPort({ path: port, baudRate: 115200 });
    const parser = serial.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    await this.waitForBoot(parser, 5000);

    const command = `wifi "${ssid}" "${password}"\n`;
    serial.write(command);

    await this.waitForMessage(parser, 'WiFi credentials saved', 3000);
    serial.close();
  }
}
```

**Credential Storage:**
```typescript
import { safeStorage } from 'electron';

class WiFiCredentialStore {
  async save(ssid: string, password: string): Promise<void> {
    const encrypted = {
      ssid: ssid,
      password: safeStorage.encryptString(password).toString('base64')
    };
    await fs.writeFile(this.configPath, JSON.stringify(encrypted));
  }

  async load(): Promise<{ ssid: string; password: string } | null> {
    const data = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
    const password = safeStorage.decryptString(Buffer.from(data.password, 'base64'));
    return { ssid: data.ssid, password };
  }
}
```

### OTA Updates

**ESP32 Side (Already Implemented!):**
```cpp
// From esp32/src/main.cpp:216-242
ArduinoOTA.setHostname(Utils::getDeviceName().c_str());
ArduinoOTA.onStart([]() { /* Orange LEDs */ });
ArduinoOTA.onEnd([]() { /* Green LEDs */ });
ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) { /* Log */ });
ArduinoOTA.onError([](ota_error_t error) { /* Red LEDs */ });
ArduinoOTA.begin();
```

**Hub Side (New Implementation):**
```typescript
class OTAUpdater {
  async updateDriver(driverIP: string, firmwarePath: string): Promise<void> {
    const espotaPath = join(
      homedir(),
      '.platformio/packages/framework-arduinoespressif32/tools/espota.py'
    );

    return new Promise((resolve, reject) => {
      const espota = spawn('python3', [
        espotaPath,
        '-i', driverIP,
        '-f', firmwarePath,
        '-r',  // progress
        '-t', '30'  // timeout
      ]);

      espota.stdout.on('data', (data) => {
        const match = data.toString().match(/(\d+)%/);
        if (match) {
          this.emit('progress', parseInt(match[1]));
        }
      });

      espota.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error(`Failed: ${code}`));
      });
    });
  }
}
```

---

## Dependencies

### Node.js Packages (Hub)

**Production:**
```json
{
  "serialport": "^12.0.0",
  "@serialport/parser-readline": "^12.0.0",
  "react-markdown": "^9.0.0"
}
```

**Development:**
```json
{
  "@types/node": "^20.0.0",
  "@types/serialport": "^8.0.0"
}
```

### System Dependencies

**macOS (Development Machine):**
- Python 3 (already installed)
- esptool.py (via PlatformIO, already installed)
- espota.py (via PlatformIO, already installed at `~/.platformio/packages/framework-arduinoespressif32/tools/espota.py`)

**ESP32 Firmware:**
- No new libraries required
- Existing: ArduinoOTA, IotWebConf, WiFi

---

## Open Questions / Decisions

1. **GitLab vs GitHub?**
   - Current: .gitlab-ci.yml suggests GitLab
   - Decision: Use GitLab Releases API
   - Future: Support both?

2. **Update Check Frequency?**
   - Options: Startup only, Periodic (hourly/daily), Manual only
   - Recommendation: Startup + Manual button
   - Setting: User can disable startup check

3. **Require All Drivers Updated Together?**
   - Option A: Update all at once (simplest)
   - Option B: Allow selective updates (more flexible)
   - Recommendation: Start with Option A, add Option B later

4. **Hub Restart After Self-Update?**
   - Option A: Automatic restart (fast but disruptive)
   - Option B: User prompt (less disruptive)
   - Recommendation: Option B (user prompt)

5. **Support Multiple WiFi Networks?**
   - Scenario: User has mesh network or multiple APs
   - Current: Single SSID/password
   - Future: Support multiple networks with priority?
   - Recommendation: Single network for now, add multi-network later

---

## Success Metrics

### User Experience
- ✅ First device setup time: < 2 minutes
- ✅ Additional device setup time: < 30 seconds each
- ✅ OTA update success rate: > 95%
- ✅ User satisfaction: Positive feedback from beta testers

### Technical
- ✅ Zero ESP32 firmware changes required
- ✅ WiFi provisioning success rate: > 99%
- ✅ Credential storage: Encrypted with OS keychain
- ✅ OTA update reliability: Handles errors gracefully, retry succeeds

### Documentation
- ✅ User documentation: Complete workflows documented
- ✅ Troubleshooting guide: Covers common issues
- ✅ API documentation: All new classes documented
- ✅ Security model: Clearly explained

---

## Timeline Estimate

**Assumptions:**
- 1 developer working part-time
- Includes testing and documentation
- Iterative development (MVP → polish)

**Phase 1: WiFi Provisioning** (2-3 weeks)
- Week 1: Core implementation (Store, Provisioner, USB detection)
- Week 2: UI components (Setup dialog, Flash wizard)
- Week 3: Testing, bug fixes, polish

**Phase 2: OTA Updates** (3-4 weeks)
- Week 1: GitLab API, Update checker, Release notes viewer
- Week 2: OTA orchestrator, espota.py integration
- Week 3: Progress monitoring UI, version tracking
- Week 4: Hub self-update, testing, bug fixes

**Phase 3: Documentation & Polish** (1-2 weeks)
- Week 1: User documentation, troubleshooting guide
- Week 2: UI polish, beta testing, iteration

**Total: 6-9 weeks**

---

## Risk Mitigation

### Technical Risks

**Risk:** espota.py not found on user's system
- **Mitigation:** Check for espota.py on startup, provide download link
- **Alternative:** Bundle espota.py with Hub installer

**Risk:** Serial port permissions on Linux/macOS
- **Mitigation:** Document `sudo chmod` command, add to troubleshooting
- **Alternative:** Prompt user to add themselves to `dialout` group

**Risk:** Network firewall blocks OTA updates
- **Mitigation:** Document required ports (UDP 3232, TCP ephemeral)
- **Alternative:** Add network diagnostics tool to Hub

**Risk:** Driver offline during update
- **Mitigation:** Skip offline Drivers, show warning
- **Alternative:** Retry after delay, or queue for next startup

### UX Risks

**Risk:** User forgets WiFi password
- **Mitigation:** Allow viewing saved password (click to reveal)
- **Alternative:** "Test connection" button to verify before saving

**Risk:** User has multiple WiFi networks
- **Mitigation:** Start with single network, add multi-network later
- **Alternative:** Prompt to select network during provisioning

**Risk:** User confused by technical terms
- **Mitigation:** Add help tooltips, use plain language
- **Alternative:** Wizard-style UI with minimal technical jargon

---

## Future Enhancements

**Post-MVP Features (Not in Initial Release):**

1. **Multi-Network Support**
   - Save multiple WiFi networks with priority
   - Driver tries networks in order until connected

2. **Encrypted Serial Provisioning**
   - Challenge-response authentication
   - AES encryption for commercial deployments

3. **Batch Provisioning**
   - Flash multiple ESP32s in parallel (USB hub)
   - Queue management for large deployments

4. **Custom Firmware Variants**
   - Different firmware for different Driver types
   - Hub detects Driver type and flashes appropriate firmware

5. **Rollback Support**
   - Keep previous firmware version
   - "Rollback to Previous Version" button
   - Automatic rollback if update fails

6. **Update Scheduling**
   - Schedule updates for specific time
   - "Update tonight at 2am" option

7. **Cloud-Based Releases**
   - Check for updates from cloud API
   - Download firmware from CDN
   - Support for beta/alpha channels

---

## References

- [ESP32 OTA Documentation](./esp32-ota.md)
- [Architecture Overview](./architecture.md)
- [Release Workflow](./release-workflow.md)
- [RGFX CLAUDE.md](../.claude/CLAUDE.md)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-26
**Status:** Ready for Implementation
**Approval Required:** Review and approve before starting Phase 1
