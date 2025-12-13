/**
 * Raylib Compatibility Layer
 *
 * Forward declarations for raylib functions to avoid header conflicts
 * with ESP32 code (both define Matrix, BlendMode, etc.).
 */
#pragma once

// Raylib config flags
#define FLAG_WINDOW_RESIZABLE 0x00000004

// Raylib Vector2 struct (needed for GetWindowPosition)
struct RaylibVector2 {
	float x;
	float y;
};

extern "C" {
RaylibVector2 GetWindowPosition(void);
void InitWindow(int width, int height, const char* title);
void CloseWindow(void);
void SetTargetFPS(int fps);
void SetWindowState(unsigned int flags);
void SetWindowMinSize(int width, int height);
void SetWindowSize(int width, int height);
void SetWindowPosition(int x, int y);
int GetScreenWidth(void);
int GetScreenHeight(void);
bool WindowShouldClose(void);
float GetFrameTime(void);
int GetFPS(void);
bool IsKeyPressed(int key);
void BeginDrawing(void);
void EndDrawing(void);
void ClearBackground(unsigned int color);
void DrawRectangleRounded(float x, float y, float width, float height, float roundness, int segments, unsigned int color);
void DrawCircle(int centerX, int centerY, float radius, unsigned int color);
void DrawText(const char* text, int posX, int posY, int fontSize, unsigned int color);
const char* TextFormat(const char* text, ...);
}
