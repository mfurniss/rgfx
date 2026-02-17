// AUTO-GENERATED from defaults.json — do not edit
// Regenerate: cd rgfx-hub && npm run generate:defaults
#pragma once
#include <cstdint>

namespace effect_defaults {

namespace pulse {
  static constexpr const char* color = "random";
  static constexpr bool reset = false;
  static constexpr uint32_t duration = 800u;
  static constexpr const char* easing = "quinticOut";
  static constexpr bool fade = true;
  static constexpr const char* collapse = "random";
}

namespace wipe {
  static constexpr const char* color = "random";
  static constexpr bool reset = false;
  static constexpr uint32_t duration = 500u;
  static constexpr const char* direction = "random";
  static constexpr const char* blendMode = "additive";
}

namespace explode {
  static constexpr const char* color = "random";
  static constexpr bool reset = false;
  static constexpr const char* centerX = "random";
  static constexpr const char* centerY = "random";
  static constexpr uint32_t particleCount = 100u;
  static constexpr float power = 120.0f;
  static constexpr uint32_t lifespan = 700u;
  static constexpr float powerSpread = 80.0f;
  static constexpr uint32_t particleSize = 6u;
  static constexpr uint32_t hueSpread = 0u;
  static constexpr float friction = 3.0f;
  static constexpr float gravity = 0.0f;
  static constexpr float lifespanSpread = 50.0f;
}

namespace bitmap {
  static constexpr bool reset = false;
  static constexpr const char* centerX = "random";
  static constexpr const char* centerY = "random";
  static constexpr uint32_t duration = 1500u;
  static constexpr const char* easing = "quadraticInOut";
  static constexpr uint32_t fadeIn = 300u;
  static constexpr uint32_t fadeOut = 300u;
  static constexpr float frameRate = 2.0f;
}

namespace background {
  static constexpr uint32_t fadeDuration = 1000u;
}

namespace projectile {
  static constexpr const char* color = "random";
  static constexpr bool reset = false;
  static constexpr const char* direction = "random";
  static constexpr float velocity = 1200.0f;
  static constexpr float friction = 0.5f;
  static constexpr float trail = 0.2f;
  static constexpr uint32_t width = 16u;
  static constexpr uint32_t height = 6u;
  static constexpr uint32_t lifespan = 5000u;
  static constexpr uint32_t particleDensity = 0u;
}

namespace text {
  static constexpr bool reset = false;
  static constexpr const char* text = "*** RGFX ***";
  static constexpr float gradientSpeed = 3.0f;
  static constexpr float gradientScale = 4.0f;
  static constexpr uint32_t duration = 5000u;
}

namespace scroll_text {
  static constexpr bool reset = true;
  static constexpr const char* text = "*** RGFX - Retro Game Effects ***";
  static constexpr float gradientSpeed = 3.0f;
  static constexpr float gradientScale = 4.0f;
  static constexpr float speed = 150.0f;
  static constexpr bool repeat = false;
  static constexpr bool snapToLed = true;
}

namespace plasma {
  static constexpr float speed = 3.0f;
  static constexpr float scale = 4.0f;
  static constexpr const char* enabled = "on";
}

namespace warp {
  static constexpr const char* enabled = "fadeIn";
  static constexpr float speed = 2.5f;
  static constexpr float scale = 3.0f;
  static constexpr const char* orientation = "horizontal";
}

namespace particle_field {
  static constexpr const char* direction = "left";
  static constexpr uint32_t density = 20u;
  static constexpr float speed = 50.0f;
  static constexpr uint32_t size = 4u;
  static constexpr const char* color = "random";
  static constexpr const char* enabled = "on";
}

namespace sparkle {
  static constexpr uint32_t duration = 3000u;
  static constexpr uint32_t density = 100u;
  static constexpr float speed = 0.75f;
  static constexpr uint32_t bloom = 90u;
  static constexpr bool reset = false;
}

} // namespace effect_defaults
