/**
 * Event Transformer Engine
 *
 * Core engine that transforms raw game events into semantic LED effects
 * using a cascading precedence system: game → subject → property → default
 *
 * The first matching handler wins and stops the cascade.
 */

import { promises as fs, watch } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TransformerContext, TransformerHandler, RgfxTopic } from './types/transformer-types';
import { getTransformersDir } from './transformer-installer';
import { eventBus } from './services/event-bus';

/**
 * Options for TransformerEngine constructor
 */
interface TransformerEngineOptions {
  /**
   * Custom module import function for testing
   * Defaults to dynamic import with cache-busting in production
   */
  importModule?: (path: string) => Promise<Record<string, unknown>>;
}

/**
 * Transformer engine implementation
 *
 * Loads transformer files from filesystem and applies cascading precedence
 * to route events to the appropriate handlers.
 */
export class TransformerEngine {
  private gameHandlers = new Map<string, TransformerHandler>();
  private subjectHandlers = new Map<string, TransformerHandler>();
  private propertyHandlers: TransformerHandler[] = [];
  private defaultHandler?: TransformerHandler;
  private watcher?: ReturnType<typeof watch>;
  private importModule: (path: string) => Promise<Record<string, unknown>>;

  constructor(
    private context: TransformerContext,
    options?: TransformerEngineOptions,
  ) {
    // Default: dynamic import with cache-busting for hot-reload support
    this.importModule =
      options?.importModule ??
      ((filePath: string) => {
        const url = pathToFileURL(filePath).href;
        return import(`${url}?t=${Date.now()}`) as Promise<Record<string, unknown>>;
      });
  }

  /**
   * Load default transformer files from user config directory
   * Game-specific transformers are loaded dynamically when any game event is received
   */
  async loadTransformers(): Promise<void> {
    const transformersDir = getTransformersDir();

    try {
      // Load subject transformers
      await this.loadSubjectTransformers(join(transformersDir, 'subjects'));

      // Load property transformers
      await this.loadPropertyTransformers(join(transformersDir, 'properties'));

      // Load default transformer
      await this.loadDefaultTransformer(join(transformersDir, 'default.js'));

      this.context.log.info(
        'Loaded default transformers: ' +
          `${this.subjectHandlers.size} subjects, ` +
          `${this.propertyHandlers.length} properties, ` +
          `${this.defaultHandler ? '1' : '0'} default`,
      );

      // Start watching for file changes
      this.startFileWatcher(transformersDir);
    } catch (error) {
      this.context.log.error('Failed to load transformers:', error);
      throw error;
    }
  }

  /**
   * Start watching transformer files for changes and reload on save
   */
  private startFileWatcher(transformersDir: string): void {
    try {
      this.watcher = watch(transformersDir, { recursive: true }, (_eventType, filename) => {
        if (!filename?.endsWith('.js')) {
          return;
        }

        this.context.log.info(`Transformer file changed: ${filename}`);
        void this.reloadTransformer(transformersDir, filename);
      });

      this.context.log.info('File watcher started for transformer hot-reload');
    } catch (error) {
      this.context.log.warn('Could not start file watcher:', error);
    }
  }

  /**
   * Reload a specific transformer file
   */
  private async reloadTransformer(transformersDir: string, filename: string): Promise<void> {
    try {
      const filePath = join(transformersDir, filename);

      if (filename.startsWith('games/') || filename.startsWith('games\\')) {
        // games/ subdirectory
        const gameName = basename(filename, '.js');
        this.gameHandlers.delete(gameName);
        await this.loadGameTransformer(gameName);
        this.context.log.info(`Reloaded game transformer: ${gameName}`);
      } else if (filename.startsWith('subjects/') || filename.startsWith('subjects\\')) {
        // subjects/ subdirectory
        const subjectName = basename(filename, '.js');
        this.subjectHandlers.delete(subjectName);
        const module = await this.importModule(filePath);
        const handler = this.extractTransformer(module);

        if (handler) {
          this.subjectHandlers.set(subjectName, handler);
          this.context.log.info(`Reloaded subject transformer: ${subjectName}`);
        }
      } else if (filename.startsWith('properties/') || filename.startsWith('properties\\')) {
        // properties/ subdirectory
        this.propertyHandlers = [];
        await this.loadPropertyTransformers(join(transformersDir, 'properties'));
        this.context.log.info('Reloaded property transformers');
      } else if (filename === 'default.js') {
        // default.js in root
        this.defaultHandler = undefined;
        await this.loadDefaultTransformer(filePath);
        this.context.log.info('Reloaded default transformer');
      }
    } catch (error) {
      this.context.log.error(`Failed to reload transformer ${filename}:`, error);
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
   * Clear effects on all connected, enabled drivers
   * Called when a game init event is received to reset driver state
   */
  private async clearAllDriverEffects(): Promise<void> {
    const connectedDrivers = this.context.drivers
      .getConnectedDrivers()
      .filter((d) => !d.disabled);

    if (connectedDrivers.length === 0) {
      this.context.log.debug('No connected drivers to clear effects');
      return;
    }

    this.context.log.info(`Clearing effects on ${connectedDrivers.length} connected driver(s)`);

    for (const driver of connectedDrivers) {
      try {
        await this.context.mqtt.publish(`rgfx/driver/${driver.mac}/clear-effects`, '', 2);
      } catch (error) {
        this.context.log.error(`Failed to clear effects on driver ${driver.id}:`, error);
      }
    }
  }

  /**
   * Parse raw topic string into RgfxTopic structure
   * @param raw Raw topic string (e.g., "pacman/player/score/p1")
   * @param payload Event payload string
   * @returns Parsed topic with pre-split segments and payload
   */
  private parseTopic(raw: string, payload: string): RgfxTopic {
    const parts = raw.split('/');
    const [namespace, subject, property, qualifier] = parts;

    return {
      raw,
      namespace,
      subject,
      property,
      qualifier,
      parts,
      payload,
    };
  }

  /**
   * Handle incoming event with cascading precedence
   * @param topic Event topic (e.g., "pacman/player/score/p1")
   * @param payload Event payload (e.g., "12450")
   */
  async handleEvent(topic: string, payload: string): Promise<void> {
    try {
      // Parse topic once into structured object (includes payload)
      const topicObj = this.parseTopic(topic, payload);
      const { namespace, subject } = topicObj;

      // Clear effects on all drivers when a game init event is received
      if (subject === 'init') {
        await this.clearAllDriverEffects();
      }

      // Clear effects on all drivers when game shuts down
      if (subject === 'shutdown') {
        await this.clearAllDriverEffects();
      }

      // Handle MAME process exit from launch script (catches all exit methods)
      if (namespace === 'rgfx' && subject === 'mame-exit') {
        const gameName = topicObj.payload || 'unknown';
        this.context.log.info(`MAME exited for game: ${gameName}`);
        await this.clearAllDriverEffects();
        return;
      }

      // Auto-load game transformer on first event from game
      // Skip for 'rgfx' namespace - reserved for system-level events (audio, driver, etc.)
      if (namespace && namespace !== 'rgfx' && !this.gameHandlers.has(namespace)) {
        await this.loadGameTransformer(namespace);
      }

      // 1. Try game-specific handler (highest priority)
      // Skip for 'rgfx' namespace - goes directly to subject handlers
      if (namespace && namespace !== 'rgfx' && this.gameHandlers.has(namespace)) {
        const handler = this.gameHandlers.get(namespace);

        if (!handler) {
          return;
        }
        const handled = await handler(topicObj, this.context);

        if (handled) {
          // Truthy values (true, non-zero, etc.) mean handled
          this.context.log.debug(`Event handled by game transformer: ${namespace} - ${topic}`);
          return;
        }
      }

      // 2. Try subject handlers (medium priority)
      if (subject && this.subjectHandlers.has(subject)) {
        const handler = this.subjectHandlers.get(subject);

        if (!handler) {
          return;
        }
        const handled = await handler(topicObj, this.context);

        if (handled) {
          // Truthy values (true, non-zero, etc.) mean handled
          this.context.log.debug(`Event handled by subject transformer: ${subject} - ${topic}`);
          return;
        }
      }

      // 3. Try property handlers (lower priority)
      for (const handler of this.propertyHandlers) {
        const handled = await handler(topicObj, this.context);

        if (handled) {
          // Truthy values (true, non-zero, etc.) mean handled
          this.context.log.debug(`Event handled by property transformer: ${topic}`);
          return;
        }
      }

      // 4. Default handler (always handles)
      if (this.defaultHandler) {
        await this.defaultHandler(topicObj, this.context);
        this.context.log.debug(`Event handled by default transformer: ${topic}`);
      } else {
        this.context.log.warn(`No handler found for event: ${topic}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.context.log.error(`Error handling event ${topic}:`, error);
      eventBus.emit('system:error', {
        errorType: 'transformer',
        message: `Transformer error for ${topic}: ${errorMessage}`,
        timestamp: Date.now(),
        details: errorStack,
      });
    }
  }

  /**
   * Load a specific game transformer dynamically
   * Called automatically when any event from a new game is received
   *
   * Note: Supports multiple concurrent game transformers.
   * Unknown games fall through to subject/pattern/default handlers.
   */
  private async loadGameTransformer(gameName: string): Promise<void> {
    try {
      const transformersDir = getTransformersDir();
      const filePath = join(transformersDir, 'games', `${gameName}.js`);

      const module = await this.importModule(filePath);
      const handler = this.extractTransformer(module);

      if (handler) {
        this.gameHandlers.set(gameName, handler);
        this.context.log.info(`Loaded game transformer: ${gameName}`);
      } else {
        this.context.log.warn(`Game transformer ${gameName}.js has no valid transform function`);
      }
    } catch (error) {
      // Log error for debugging but don't crash
      // Game will fall through to generic handlers
      this.context.log.warn(
        `Could not load game transformer for ${gameName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load subject transformers from subjects/ directory
   */
  private async loadSubjectTransformers(subjectsDir: string): Promise<void> {
    try {
      const files = await fs.readdir(subjectsDir);

      for (const file of files) {
        if (!file.endsWith('.js')) {
          continue;
        }

        const subjectName = file.replace('.js', '');
        const filePath = join(subjectsDir, file);

        try {
          const module = await this.importModule(filePath);
          const handler = this.extractTransformer(module);

          if (handler) {
            this.subjectHandlers.set(subjectName, handler);
          }
        } catch (error) {
          this.context.log.error(`Failed to load subject transformer ${file}:`, error);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Load property transformers from properties/ directory
   */
  private async loadPropertyTransformers(propertiesDir: string): Promise<void> {
    try {
      const files = await fs.readdir(propertiesDir);

      for (const file of files) {
        if (!file.endsWith('.js')) {
          continue;
        }

        const filePath = join(propertiesDir, file);

        try {
          const module = await this.importModule(filePath);
          const handler = this.extractTransformer(module);

          if (handler) {
            this.propertyHandlers.push(handler);
          }
        } catch (error) {
          this.context.log.error(`Failed to load property transformer ${file}:`, error);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Load default transformer
   */
  private async loadDefaultTransformer(filePath: string): Promise<void> {
    try {
      const module = await this.importModule(filePath);
      const handler = this.extractTransformer(module);

      if (handler) {
        this.defaultHandler = handler;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.context.log.error('Failed to load default transformer:', error);
      }
    }
  }

  /**
   * Extract transform function from transformer module
   * Supports both named export and default export patterns
   */
  private extractTransformer(module: Record<string, unknown>): TransformerHandler | null {
    // Try named export 'transform'
    if (typeof module.transform === 'function') {
      return module.transform as TransformerHandler;
    }

    // Try default export with transform property
    const defaultExport = module.default as Record<string, unknown> | undefined;

    if (defaultExport && typeof defaultExport.transform === 'function') {
      return defaultExport.transform as TransformerHandler;
    }

    // Try default export as function
    if (typeof defaultExport === 'function') {
      return defaultExport as TransformerHandler;
    }

    return null;
  }
}
