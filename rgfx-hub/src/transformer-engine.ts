/**
 * Event Transformer Engine
 *
 * Core engine that transforms raw game events into semantic LED effects
 * using a cascading precedence system: game → subject → property → default
 *
 * The first matching handler wins and stops the cascade.
 */

import { promises as fs, watch } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
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
  private failedGameLoads = new Set<string>();
  private subjectHandlers = new Map<string, TransformerHandler>();
  private propertyHandlers: TransformerHandler[] = [];
  private defaultHandler?: TransformerHandler;
  private watcher?: ReturnType<typeof watch>;
  private clearAllTimersFn?: () => void;
  private importModule: (path: string) => Promise<Record<string, unknown>>;
  constructor(
    private context: TransformerContext,
    options?: TransformerEngineOptions,
  ) {
    if (options?.importModule) {
      this.importModule = options.importModule;
    } else {
      // Content-hash URL prevents V8 module cache leak. Relative imports
      // are rewritten with dependency content hashes so shared modules
      // (global.js, utils/) are always loaded fresh after changes.
      this.importModule = async (filePath: string) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const rewritten = await this.rewriteRelativeImports(filePath, content);
        const hash = createHash('sha1').update(rewritten).digest('hex').slice(0, 12);

        if (rewritten === content) {
          // No relative imports — use direct URL with cache-bust
          const url = pathToFileURL(filePath).href;
          return (await import(`${url}?v=${hash}`)) as Record<string, unknown>;
        }

        // Temp file in same directory preserves relative path resolution.
        // The .mjs extension is ignored by the file watcher (.js filter).
        const tempPath = join(dirname(filePath), `.rgfx-${hash}.mjs`);
        await fs.writeFile(tempPath, rewritten);

        try {
          const url = pathToFileURL(tempPath).href;

          return (await import(url)) as Record<string, unknown>;
        } finally {
          await fs.unlink(tempPath).catch(() => undefined);
        }
      };
    }
  }

  /**
   * Rewrite relative import specifiers with content-hash cache-busting.
   * Ensures dependencies are always loaded fresh from disk on hot reload.
   */
  private async rewriteRelativeImports(filePath: string, content: string): Promise<string> {
    const dir = dirname(filePath);
    const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
    let result = content;
    const seen = new Set<string>();

    for (const match of content.matchAll(importRegex)) {
      const specifier = match[1];

      if (seen.has(specifier)) {
        continue;
      }

      seen.add(specifier);

      const depPath = resolve(dir, specifier);

      try {
        const depContent = await fs.readFile(depPath, 'utf-8');
        const depHash = createHash('sha1').update(depContent).digest('hex').slice(0, 12);
        result = result.replaceAll(`'${specifier}'`, `'${specifier}?v=${depHash}'`);
        result = result.replaceAll(`"${specifier}"`, `"${specifier}?v=${depHash}"`);
      } catch {
        // Dependency doesn't exist — skip rewriting
      }
    }

    return result;
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

      // Load timer cleanup from transformer utils (plain import — no cache-bust
      // so we get the same module instance the transformers use)
      try {
        const asyncUtilsUrl = pathToFileURL(join(transformersDir, 'utils', 'async.js')).href;
        const asyncUtils = (await import(asyncUtilsUrl)) as Record<string, unknown>;

        if (typeof asyncUtils.clearAllTimers === 'function') {
          this.clearAllTimersFn = asyncUtils.clearAllTimers as () => void;
        }
      } catch {
        this.context.log.warn('Could not load clearAllTimers from transformer utils');
      }

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

    this.subjectHandlers.clear();
    await this.loadSubjectTransformers(join(transformersDir, 'subjects'));

    this.propertyHandlers = [];
    await this.loadPropertyTransformers(join(transformersDir, 'properties'));

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
      // Cache failure so we don't retry on every event from this game
      this.failedGameLoads.add(gameName);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.log.warn(
        `Could not load game transformer for ${gameName}: ${errorMessage}`,
      );
      eventBus.emit('system:error', {
        errorType: 'transformer',
        message: `Could not load game transformer: ${errorMessage}`,
        timestamp: Date.now(),
        filePath: join(getTransformersDir(), 'games', `${gameName}.js`),
        details: error instanceof Error ? error.stack : undefined,
      });
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
