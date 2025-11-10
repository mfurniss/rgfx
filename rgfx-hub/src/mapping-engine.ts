/**
 * Event Mapping Engine
 *
 * Core engine that transforms raw game events into semantic LED effects
 * using a cascading precedence system: game → subject → pattern → default
 *
 * The first matching handler wins and stops the cascade.
 */

import { promises as fs, watch } from 'node:fs';
import { join, basename } from 'node:path';
import type {
  MappingContext,
  MappingHandler,
} from './types/mapping-types';
import { getMappingsDir } from './mapper-installer';

/**
 * Mapping engine implementation
 *
 * Loads mapper files from filesystem and applies cascading precedence
 * to route events to the appropriate handlers.
 */
export class MappingEngine {
  private gameHandlers = new Map<string, MappingHandler>();
  private subjectHandlers = new Map<string, MappingHandler>();
  private patternHandlers: MappingHandler[] = [];
  private defaultHandler?: MappingHandler;
  private watcher?: ReturnType<typeof watch>;

  constructor(private context: MappingContext) {}

  /**
   * Load default mapping files from user data directory
   * Game-specific mappers are loaded dynamically when any game event is received
   */
  async loadMappings(): Promise<void> {
    const mappingsDir = getMappingsDir();

    try {
      // Load subject mappers
      await this.loadSubjectMappers(join(mappingsDir, 'subjects'));

      // Load pattern mappers
      await this.loadPatternMappers(join(mappingsDir, 'patterns'));

      // Load default mapper
      await this.loadDefaultMapper(join(mappingsDir, 'default.js'));

      this.context.log.info(
        `Loaded default mappings: ` +
          `${this.subjectHandlers.size} subjects, ` +
          `${this.patternHandlers.length} patterns, ` +
          `${this.defaultHandler ? '1' : '0'} default`,
      );

      // Start watching for file changes
      this.startFileWatcher(mappingsDir);
    } catch (error) {
      this.context.log.error('Failed to load mappings:', error);
      throw error;
    }
  }

  /**
   * Start watching mapper files for changes and reload on save
   */
  private startFileWatcher(mappingsDir: string): void {
    try {
      this.watcher = watch(
        mappingsDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename?.endsWith('.js')) return;

          this.context.log.info(`Mapper file changed: ${filename}`);
          void this.reloadMapper(mappingsDir, filename);
        },
      );

      this.context.log.info('File watcher started for mapper hot-reload');
    } catch (error) {
      this.context.log.warn('Could not start file watcher:', error);
    }
  }

  /**
   * Reload a specific mapper file
   */
  private async reloadMapper(
    mappingsDir: string,
    filename: string,
  ): Promise<void> {
    try {
      const filePath = join(mappingsDir, filename);

      // Check if this is in games/ subdirectory
      if (filename.startsWith('games/') || filename.startsWith('games\\')) {
        const gameName = basename(filename, '.js');
        this.gameHandlers.delete(gameName);
        await this.loadGameMapper(gameName);
        this.context.log.info(`Reloaded game mapper: ${gameName}`);
      }
      // Check if this is in subjects/ subdirectory
      else if (filename.startsWith('subjects/') || filename.startsWith('subjects\\')) {
        const subjectName = basename(filename, '.js');
        this.subjectHandlers.delete(subjectName);
        const module = (await import(
          `${filePath}?t=${Date.now()}`
        )) as Record<string, unknown>;
        const handler = this.extractHandler(module);
        if (handler) {
          this.subjectHandlers.set(subjectName, handler);
          this.context.log.info(`Reloaded subject mapper: ${subjectName}`);
        }
      }
      // Check if this is in patterns/ subdirectory
      else if (filename.startsWith('patterns/') || filename.startsWith('patterns\\')) {
        this.patternHandlers = [];
        await this.loadPatternMappers(join(mappingsDir, 'patterns'));
        this.context.log.info(`Reloaded pattern mappers`);
      }
      // Check if this is default.js in root
      else if (filename === 'default.js') {
        this.defaultHandler = undefined;
        await this.loadDefaultMapper(filePath);
        this.context.log.info(`Reloaded default mapper`);
      }
    } catch (error) {
      this.context.log.error(`Failed to reload mapper ${filename}:`, error);
    }
  }

  /**
   * Stop the file watcher (cleanup)
   */
  dispose(): void {
    if (this.watcher) {
      this.watcher.close();
      this.context.log.info('File watcher stopped');
    }
  }

  /**
   * Handle incoming event with cascading precedence
   * @param topic Event topic (e.g., "pacman/player/score/p1")
   * @param payload Event payload (e.g., "12450")
   */
  async handleEvent(topic: string, payload: string): Promise<void> {
    try {
      // Parse payload for potential future use
      this.parsePayload(payload);
      const [game, subject] = topic.split('/');

      // Auto-load game mapper on first event from game
      if (game && !this.gameHandlers.has(game)) {
        await this.loadGameMapper(game);
      }

      // 1. Try game-specific handler (highest priority)
      if (game && this.gameHandlers.has(game)) {
        const handler = this.gameHandlers.get(game);
        if (!handler) return;
        const handled = await handler(topic, payload, this.context);
        if (handled) { // Truthy values (true, non-zero, etc.) mean handled
          this.context.log.debug(
            `Event handled by game mapper: ${game} - ${topic}`,
          );
          return;
        }
      }

      // 2. Try subject handlers (medium priority)
      if (subject && this.subjectHandlers.has(subject)) {
        const handler = this.subjectHandlers.get(subject);
        if (!handler) return;
        const handled = await handler(topic, payload, this.context);
        if (handled) { // Truthy values (true, non-zero, etc.) mean handled
          this.context.log.debug(
            `Event handled by subject mapper: ${subject} - ${topic}`,
          );
          return;
        }
      }

      // 3. Try pattern handlers (lower priority)
      for (const handler of this.patternHandlers) {
        const handled = await handler(topic, payload, this.context);
        if (handled) { // Truthy values (true, non-zero, etc.) mean handled
          this.context.log.debug(
            `Event handled by pattern mapper: ${topic}`,
          );
          return;
        }
      }

      // 4. Default handler (always handles)
      if (this.defaultHandler) {
        await this.defaultHandler(topic, payload, this.context);
        this.context.log.debug(`Event handled by default mapper: ${topic}`);
      } else {
        this.context.log.warn(`No handler found for event: ${topic}`);
      }
    } catch (error) {
      this.context.log.error(`Error handling event ${topic}:`, error);
    }
  }

  /**
   * Parse payload string to appropriate type
   * Auto-detects JSON, numbers, or returns string
   */
  private parsePayload(payload: string): string | number | object {
    // Detect JSON
    if (payload.startsWith('{') || payload.startsWith('[')) {
      try {
        return JSON.parse(payload) as object;
      } catch {
        return payload; // Return as string if JSON parsing fails
      }
    }

    // Try number
    const trimmed = payload.trim();
    if (trimmed !== '') {
      const num = Number(trimmed);
      if (!isNaN(num)) {
        return num;
      }
    }

    // Return as string
    return payload;
  }

  /**
   * Load a specific game mapper dynamically
   * Called automatically when any event from a new game is received
   *
   * Note: Supports multiple concurrent game mappers.
   * Unknown games fall through to subject/pattern/default handlers.
   */
  private async loadGameMapper(gameName: string): Promise<void> {
    try {
      const mappingsDir = getMappingsDir();
      const filePath = join(mappingsDir, 'games', `${gameName}.js`);

      // Dynamically import the game mapper with cache-busting
      const module = (await import(
        `${filePath}?t=${Date.now()}`
      )) as Record<string, unknown>;
      const handler = this.extractHandler(module);

      if (handler) {
        this.gameHandlers.set(gameName, handler);
        this.context.log.info(`Loaded game mapper: ${gameName}`);
      } else {
        this.context.log.warn(
          `Game mapper ${gameName}.js has no valid handler function`,
        );
      }
    } catch {
      // Silently handle all errors during mapper loading
      // This includes:
      // - File not found (ENOENT, ERR_MODULE_NOT_FOUND)
      // - Electron app not initialized (in tests)
      // - Invalid JavaScript syntax
      // Game will fall through to generic handlers
      this.context.log.debug(
        `Could not load game mapper for ${gameName}, will use generic handlers`,
      );
    }
  }

  /**
   * Load subject mappers from subjects/ directory
   */
  private async loadSubjectMappers(subjectsDir: string): Promise<void> {
    try {
      const files = await fs.readdir(subjectsDir);

      for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const subjectName = file.replace('.js', '');
        const filePath = join(subjectsDir, file);

        try {
          const module = (await import(filePath)) as Record<string, unknown>;
          const handler = this.extractHandler(module);

          if (handler) {
            this.subjectHandlers.set(subjectName, handler);
          }
        } catch (error) {
          this.context.log.error(
            `Failed to load subject mapper ${file}:`,
            error,
          );
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Load pattern mappers from patterns/ directory
   */
  private async loadPatternMappers(patternsDir: string): Promise<void> {
    try {
      const files = await fs.readdir(patternsDir);

      for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const filePath = join(patternsDir, file);

        try {
          const module = (await import(filePath)) as Record<string, unknown>;
          const handler = this.extractHandler(module);

          if (handler) {
            this.patternHandlers.push(handler);
          }
        } catch (error) {
          this.context.log.error(
            `Failed to load pattern mapper ${file}:`,
            error,
          );
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Load default mapper
   */
  private async loadDefaultMapper(filePath: string): Promise<void> {
    try {
      const module = (await import(filePath)) as Record<string, unknown>;
      const handler = this.extractHandler(module);

      if (handler) {
        this.defaultHandler = handler;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.context.log.error('Failed to load default mapper:', error);
      }
    }
  }

  /**
   * Extract handler function from mapper module
   * Supports both named export and default export patterns
   */
  private extractHandler(
    module: Record<string, unknown>,
  ): MappingHandler | null {
    // Try named export 'handle'
    if (typeof module.handle === 'function') {
      return module.handle as MappingHandler;
    }

    // Try default export with handle property
    const defaultExport = module.default as Record<string, unknown> | undefined;
    if (defaultExport && typeof defaultExport.handle === 'function') {
      return defaultExport.handle as MappingHandler;
    }

    // Try default export as function
    if (typeof defaultExport === 'function') {
      return defaultExport as MappingHandler;
    }

    return null;
  }
}
