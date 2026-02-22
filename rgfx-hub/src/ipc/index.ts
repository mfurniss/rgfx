import { handlers } from './handler-registry';
import type { IpcHandlersDeps } from './handler-registry';

export function registerIpcHandlers(deps: IpcHandlersDeps): void {
  for (const register of handlers) {
    register(deps);
  }
}
