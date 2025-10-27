# HTML Templates for ESP32 Web Interface

This directory contains HTML templates for the ESP32 web configuration portal. Templates are automatically converted to C++ PROGMEM headers at build time to save RAM.

## How It Works

1. **Write HTML templates** in this directory (`.html` files)
2. **Use template variables** with `{{VARIABLE_NAME}}` syntax
3. **Build automatically converts** HTML to PROGMEM headers in `src/generated/`
4. **Runtime replacement** substitutes template variables with actual values

## Template Variables

The following template variables are available in `status.html`:

- `{{DEVICE_NAME}}` - Device name from `Utils::getDeviceName()`
- `{{MAC_ADDRESS}}` - MAC address from `WiFi.macAddress()`
- `{{UPTIME}}` - Uptime in seconds
- `{{NETWORK_STATUS}}` - Network status table rows (dynamically generated)
- `{{LED_BRIGHTNESS}}` - LED brightness value
- `{{LED_DATA_PIN}}` - LED data pin number

## Adding New Templates

1. Create a new `.html` file in this directory:
   ```bash
   touch html/my_page.html
   ```

2. Write your HTML with template variables:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>{{PAGE_TITLE}}</title>
   </head>
   <body>
       <h1>{{HEADING}}</h1>
       <p>{{CONTENT}}</p>
   </body>
   </html>
   ```

3. Build the firmware (HTML conversion runs automatically):
   ```bash
   pio run
   ```

4. Include the generated header in your C++ code:
   ```cpp
   #include "generated/html_my_page.h"

   String page = String(HTML_MY_PAGE);
   page = replaceTemplate(page.c_str(), "PAGE_TITLE", "My Page");
   page = replaceTemplate(page.c_str(), "HEADING", "Hello World");
   page = replaceTemplate(page.c_str(), "CONTENT", "This is my content");
   server.send(200, "text/html", page);
   ```

## Conversion Script

The conversion is handled by [`html_to_progmem.py`](../html_to_progmem.py):

- Runs as a **pre-build script** in PlatformIO
- Converts all `.html` files in this directory
- Generates C++ headers in `src/generated/`
- Stores HTML in PROGMEM (flash memory) to save RAM
- Uses raw string literals for clean formatting

## Benefits

### Before (String Concatenation)
```cpp
String page = "<!DOCTYPE html><html><head>";
page += "<title>RGFX Driver</title>";
page += "<style>body{font-family:sans-serif;}</style>";
page += "</head><body>";
page += "<h1>Status: " + status + "</h1>";
page += "</body></html>";
```

**Problems:**
- Hard to read and maintain
- Difficult to edit HTML
- Wastes RAM during concatenation
- No syntax highlighting

### After (PROGMEM Templates)
```html
<!-- html/status.html -->
<!DOCTYPE html>
<html>
<head>
    <title>RGFX Driver</title>
    <style>
        body { font-family: sans-serif; }
    </style>
</head>
<body>
    <h1>Status: {{STATUS}}</h1>
</body>
</html>
```

```cpp
// config_portal.cpp
String page = String(HTML_STATUS);
page = replaceTemplate(page.c_str(), "STATUS", status);
server.send(200, "text/html", page);
```

**Benefits:**
- Clean, readable HTML in separate file
- Full syntax highlighting and formatting
- Stored in flash (PROGMEM) to save RAM
- Easy to maintain and edit
- Automatic conversion at build time

## Helper Functions

### Table Row Generator

To avoid repetitive HTML table row generation, use the `tableRow()` helper:

```cpp
// Before - repetitive HTML concatenation
String html;
html += "<tr><td>WiFi Status</td><td>Connected</td></tr>";
html += "<tr><td>SSID</td><td>" + WiFi.SSID() + "</td></tr>";
html += "<tr><td>IP Address</td><td>" + WiFi.localIP().toString() + "</td></tr>";

// After - clean and concise
String html;
html += tableRow("WiFi Status", "Connected");
html += tableRow("SSID", WiFi.SSID());
html += tableRow("IP Address", WiFi.localIP().toString());
```

The `tableRow(label, value)` helper generates: `<tr><td>label</td><td>value</td></tr>`

**Defined in config_portal.cpp:**
```cpp
inline String tableRow(const String& label, const String& value) {
    return "<tr><td>" + label + "</td><td>" + value + "</td></tr>";
}
```

## File Structure

```
esp32/
├── html/                        # HTML templates (source)
│   ├── status.html              # Status page template
│   └── README.md                # This file
├── src/
│   ├── generated/               # Auto-generated headers (git-ignored)
│   │   └── html_status.h        # PROGMEM header for status.html
│   └── config_portal.cpp        # Uses HTML_STATUS from generated header
├── html_to_progmem.py          # Conversion script
└── platformio.ini               # Configured to run conversion pre-build
```

## Memory Usage

HTML stored in PROGMEM (flash memory):
- ✅ **No RAM usage** until loaded into String
- ✅ **Only one copy** loaded at a time (per request)
- ✅ **Freed immediately** after response sent
- ✅ **Flash is abundant** (1.3MB) vs RAM (320KB)

## Editing Tips

1. **Test HTML separately**: Open `.html` files in browser to check formatting
2. **Use simple template syntax**: Only `{{VARIABLE_NAME}}` is supported
3. **Minification**: HTML is auto-minified (whitespace collapsed) during conversion
4. **Validation**: Use standard HTML validators before committing
5. **Preview changes**: Full rebuild required after HTML changes

## Troubleshooting

### Template not updating after HTML changes
```bash
# Clean build and rebuild
pio run -t clean && pio run
```

### Generated header not found
```bash
# Manually run conversion script
python3 html_to_progmem.py

# Check that src/generated/ directory exists
ls -la src/generated/
```

### Template variable not replaced
- Ensure variable name matches exactly (case-sensitive)
- Check that `replaceTemplate()` is called with correct key
- Verify template uses `{{KEY}}` syntax (double braces)

## Future Enhancements

Potential improvements for the template system:

- [ ] Support for template conditionals (`{{#if}}...{{/if}}`)
- [ ] Support for loops (`{{#each}}...{{/each}}`)
- [ ] CSS/JS minification
- [ ] Multiple template engines (Mustache, Jinja2, etc.)
- [ ] Watch mode for auto-rebuild during development
- [ ] Template validation and linting

For now, the simple placeholder replacement is sufficient and keeps the system lightweight.
