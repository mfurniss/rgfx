/**
 * Event Transformer Engine
 *
 * Core engine that transforms raw game events into semantic LED effects
 * using a cascading precedence system: game → subject → property → default
 *
 * The first matching handler wins and stops the cascade.
 */

import { watch } from 'node:fs';
import { join, basename } from 'node:path';
import type { TransformerContext, TransformerHandler, RgfxTopic } from './types/transformer-types';
import { getTransformersDir } from './transformer-installer';
import { eventBus } from './services/event-bus';
import { getErrorMessage } from './utils/driver-utils';
import { createTransformerModuleLoader, type TransformerModuleLoader } from './transformer-module-loader';

/**
 * Options for TransformerEngine constructor
 */
interface TransformerEngineOptions {
  /**
   * Custom module import function for testing
   * Defaults to dynamic import with cache-busting in production
   */
  importModule?: (path: string) => Promise<Record<string, unknown>>;

  /** Cancel all pending transformer timers (injected from service factory) */
  clearAllTimers?: () => void;
}

/**
 * Transformer engine implementation
 *
 * Loads transformer files from filesystem and applies cascading precedence
 * to route events to the appropriate handlers.
 */
export class TransformerEngine {
  private gameHandlers = new Map<string, TransformerHandler>();
  private failedGameLoads = new Set<string>();
  private subjectHandlers = new Map<string, TransformerHandler>();
  private propertyHandlers: TransformerHandler[] = [];
  private defaultHandler?: TransformerHandler;
  private watcher?: ReturnType<typeof watch>;
  private clearAllTimersFn?: () => void;
  private loader: TransformerModuleLoader;

  constructor(
    private context: TransformerContext,
    options?: TransformerEngineOptions,
  ) {
    this.clearAllTimersFn = options?.clearAllTimers;
    this.loader = createTransformerModuleLoader(options?.importModule, context.log);
  }

  /**
   * Load default transformer files from user config directory
   * Game-specific transformers are loaded dynamically when any game event is received
   */
  async loadTransformers(): Promise<void> {
    const transformersDir = getTransformersDir();

    try {
      // Load subject and property transformers via shared loader
      this.subjectHandlers = await this.loader.loadHandlersFromDir(
        join(transformersDir, 'subjects'),
      );

      const propertyMap = await this.loader.loadHandlersFromDir(
        join(transformersDir, 'properties'),
      );
      this.propertyHandlers = [...propertyMap.values()];

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
        if (!filename) {
          return;
        }

        const isBitmapChange =
          (filename.startsWith('bitmaps/') || filename.startsWith('bitmaps\\')) &&
          filename.endsWith('.json');

        if (!filename.endsWith('.js') && !isBitmapChange) {
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

      if (filename.startsWith('bitmaps/') || filename.startsWith('bitmaps\\')) {
        await this.reloadAllTransformers(transformersDir);
        this.context.log.info(`Bitmap changed: ${filename} — reloaded all transformers`);
        return;
      }

      if (filename.startsWith('games/') || filename.startsWith('games\\')) {
        // games/ subdirectory
        const gameName = basename(filename, '.js');
        this.gameHandlers.delete(gameName);
        this.failedGameLoads.delete(gameName);
        await this.loadGameTransformer(gameName);
        this.context.log.info(`Reloaded game transformer: ${gameName}`);
      } else if (filename.startsWith('subjects/') || filename.startsWith('subjects\\')) {
        // subjects/ subdirectory
        const subjectName = basename(filename, '.js');
        this.subjectHandlers.delete(subjectName);
        const module = await this.loader.importModule(filePath);
        const handler = this.loader.extractHandler(module);

        if (handler) {
          this.subjectHandlers.set(subjectName, handler);
          this.context.log.info(`Reloaded subject transformer: ${subjectName}`);
        }
      } else if (filename.startsWith('properties/') || filename.startsWith('properties\\')) {
        // properties/ subdirectory
        const propertyMap = await this.loader.loadHandlersFromDir(
          join(transformersDir, 'properties'),
        );
        this.propertyHandlers = [...propertyMap.values()];
        this.context.log.info('Reloaded property transformers');
      } else if (filename === 'default.js') {
        // default.js in root
        this.defaultHandler = undefined;
        await this.loadDefaultTransformer(filePath);
        this.context.log.info('Reloaded default transformer');
      } else {
        // Shared dependency changed (global.js, utils/*.js, palettes.js, etc.)
        await this.reloadAllTransformers(transformersDir);
        this.context.log.info(`Shared dependency changed: ${filename} — reloaded all transformers`);
      }
    } catch (error) {
      this.context.log.error(`Failed to reload transformer ${filename}:`, error);
    }
  }

  /**
   * Reload all loaded transformers (used when a shared dependency changes)
   */
  private async reloadAllTransformers(transformersDir: string): Promise<void> {
    this.failedGameLoads.clear();
    const gameNames = [...this.gameHandlers.keys()];

    for (const gameName of gameNames) {
      this.gameHandlers.delete(gameName);
      await this.loadGameTransformer(gameName);
    }

    this.subjectHandlers = await this.loader.loadHandlersFromDir(
      join(transformersDir, 'subjects'),
    );

    const propertyMap = await this.loader.loadHandlersFromDir(
      join(transformersDir, 'properties'),
    );
    this.propertyHandlers = [...propertyMap.values()];

    this.defaultHandler = undefined;
    await this.loadDefaultTransformer(join(transformersDir, 'default.js'));
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
   * Clear transformer state (stops loops that check state values)
   * Called when user manually clears all effects
   */
  clearState(): void {
    this.context.log.info('Clearing transformer state');
    this.context.state.clear();
  }

  /**
   * Clear effects on all connected, enabled drivers.
   * Cancels timers, resets state, sends UDP clear, and MQTT QoS 2 backup.
   */
  private async clearAllDriverEffects(): Promise<void> {
    // Cancel all pending transformer timers (sleep, trackedTimeout)
    this.clearAllTimersFn?.();

    // Reset transformer state so loops checking state values stop naturally
    this.context.state.clear();

    // Immediate UDP clear (fire-and-forget, arrives before MQTT handshake completes)
    this.context.broadcast({ effect: 'clear' });

    const connectedDrivers = this.context.drivers
      .getConnectedDrivers()
      .filter((d) => !d.disabled);

    if (connectedDrivers.length === 0) {
      this.context.log.debug('No connected drivers to clear effects');
      return;
    }

    // Reliable MQTT clear (QoS 2 guaranteed delivery as backup)
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

      // Full reset: clear timers, state, UDP + MQTT. Sent by Lua bootstrap
      // before loading a new game. The init event follows ~500ms later,
      // giving MQTT clears time to reach all drivers.
      if (namespace === 'rgfx' && subject === 'reset') {
        this.context.log.info('Reset requested — clearing all effects');
        await this.clearAllDriverEffects();
        return;
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

      // Handle explicit clear-all-effects request (e.g., from smoke test via event log)
      if (namespace === 'rgfx' && subject === 'clear-effects') {
        this.context.log.info('Clear all effects requested');
        await this.clearAllDriverEffects();
        return;
      }

      // Auto-load game transformer on first event from game
      // Skip for 'rgfx' namespace - reserved for system-level events (audio, driver, etc.)
      if (
        namespace &&
        namespace !== 'rgfx' &&
        !this.gameHandlers.has(namespace) &&
        !this.failedGameLoads.has(namespace)
      ) {
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
      this.context.log.error(`Error handling event ${topic}:`, error);
      eventBus.emit('system:error', {
        errorType: 'transformer',
        message: `Transformer error for ${topic}: ${getErrorMessage(error)}`,
        timestamp: Date.now(),
        details: error instanceof Error ? error.stack : undefined,
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

      const module = await this.loader.importModule(filePath);
      const handler = this.loader.extractHandler(module);

      if (handler) {
        this.gameHandlers.set(gameName, handler);
        this.context.log.info(`Loaded game transformer: ${gameName}`);
      } else {
        this.context.log.warn(`Game transformer ${gameName}.js has no valid transform function`);
      }
    } catch (error) {
      // Cache failure so we don't retry on every event from this game
      this.failedGameLoads.add(gameName);
      this.context.log.warn(
        `Could not load game transformer for ${gameName}: ${getErrorMessage(error)}`,
      );
      eventBus.emit('system:error', {
        errorType: 'transformer',
        message: `Could not load game transformer: ${getErrorMessage(error)}`,
        timestamp: Date.now(),
        filePath: join(getTransformersDir(), 'games', `${gameName}.js`),
        details: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Load default transformer
   */
  private async loadDefaultTransformer(filePath: string): Promise<void> {
    try {
      const module = await this.loader.importModule(filePath);
      const handler = this.loader.extractHandler(module);

      if (handler) {
        this.defaultHandler = handler;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.context.log.error('Failed to load default transformer:', error);
      }
    }
  }
}
