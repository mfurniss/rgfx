/**
 * Raylib Compatibility Layer
 *
 * Forward declarations for raylib functions to avoid header conflicts
 * with ESP32 code (both define Matrix, BlendMode, etc.).
 */
#pragma once

extern "C" {
void InitWindow(int width, int height, const char* title);
void CloseWindow(void);
void SetTargetFPS(int fps);
bool WindowShouldClose(void);
float GetFrameTime(void);
int GetFPS(void);
bool IsKeyPressed(int key);
void BeginDrawing(void);
void EndDrawing(void);
void ClearBackground(unsigned int color);
void DrawRectangleRounded(float x, float y, float width, float height, float roundness, int segments, unsigned int color);
void DrawText(const char* text, int posX, int posY, int fontSize, unsigned int color);
const char* TextFormat(const char* text, ...);
}
