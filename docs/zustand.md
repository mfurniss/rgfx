# Zustand - State Management for React

**Library:** pmndrs/zustand
**GitHub:** https://github.com/pmndrs/zustand
**Docs:** https://zustand.docs.pmnd.rs/

## Overview

Zustand is a small, fast, and scalable state management solution using simplified flux principles. It features a hook-based API that avoids boilerplate and opinionated patterns.

**Key Features:**
- Minimal API - Under 1KB
- No providers needed
- Hook-based consumption
- TypeScript support
- Middleware support (devtools, persist, immer)
- Addresses React concurrency and zombie child problems

## Installation

```bash
npm install zustand
```

## Basic Usage

### Creating a Store

Stores in Zustand are hooks containing primitives, objects, and functions. State updates must be immutable, with the `set` function handling state merging:

```typescript
import { create } from 'zustand'

const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}))
```

### Using in Components

Use the hook anywhere - no providers needed. Select state and the component will re-render on changes:

```tsx
function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  return <h1>{bears} around here...</h1>
}

function Controls() {
  const increasePopulation = useBearStore((state) => state.increasePopulation)
  return <button onClick={increasePopulation}>one up</button>
}
```

## TypeScript Usage

TypeScript requires the pattern `create<State>()()`:

```typescript
interface BearState {
  bears: number
  increase: (by: number) => void
}

const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
}))
```

### With Middleware

When using middleware, the double parentheses pattern is required:

```typescript
const useBearStore = create<BearState>()(
  devtools(
    persist(
      (set) => ({
        bears: 0,
        increase: (by) => set((state) => ({ bears: state.bears + by })),
      }),
      { name: 'bear-storage' }
    )
  )
)
```

## State Selection

### Basic Selection

```typescript
const bears = useBearStore((state) => state.bears)
```

### Multiple Selection

For multiple selections returning objects or arrays, use `useShallow` to prevent unnecessary re-renders:

```typescript
import { useShallow } from 'zustand/react/shallow'

const { nuts, honey } = useBearStore(
  useShallow((state) => ({ nuts: state.nuts, honey: state.honey }))
)
```

## Async Actions

Async operations work without special handling - just call `set` when ready:

```typescript
const useFishStore = create((set) => ({
  fishies: {},
  fetch: async (pond) => {
    const response = await fetch(pond)
    set({ fishies: await response.json() })
  },
}))
```

## External State Access

Utility functions attached to the hook enable non-reactive state access:

```typescript
// Get state without subscribing
const paw = useDogStore.getState().paw

// Subscribe to changes
const unsub = useDogStore.subscribe(console.log)

// Update state externally
useDogStore.setState({ paw: false })

// Unsubscribe
unsub()
```

## Middleware

### Persist Middleware

Stores data using localStorage or custom storage solutions:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      bears: 0,
      increase: (by) => set((state) => ({ bears: state.bears + by })),
    }),
    {
      name: 'bear-storage', // unique name for localStorage key
    }
  )
)
```

### DevTools Middleware

Connects to Redux DevTools Chrome extension for debugging:

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useBearStore = create<BearState>()(
  devtools((set) => ({
    bears: 0,
    increase: (by) => set((state) => ({ bears: state.bears + by })),
  }))
)
```

### Immer Middleware

Simplifies nested state updates through mutation-like syntax:

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const useBearStore = create<BearState>()(
  immer((set) => ({
    bears: 0,
    increase: (by) => set((state) => {
      state.bears += by // Mutate directly with Immer!
    }),
  }))
)
```

### Combining Middleware

Middleware can be composed together:

```typescript
const useBearStore = create<BearState>()(
  devtools(
    persist(
      immer((set) => ({
        bears: 0,
        increase: (by) => set((state) => {
          state.bears += by
        }),
      })),
      { name: 'bear-storage' }
    )
  )
)
```

## Advanced Patterns

### Computed/Derived State

Use selectors or getter functions for computed values:

```typescript
const useStore = create((set, get) => ({
  items: [],

  // Method approach
  getCompletedItems: () => get().items.filter(item => item.completed),

  // Or use selector in component
  // const completed = useStore(state => state.items.filter(i => i.completed))
}))
```

### Splitting Stores into Slices

For maintainability, split large stores into slices:

```typescript
const createBearSlice = (set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
})

const createFishSlice = (set) => ({
  fishes: 0,
  addFish: () => set((state) => ({ fishes: state.fishes + 1 })),
})

const useStore = create((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}))
```

### Subscribe with Selector

Enable selective subscriptions with optional equality functions:

```typescript
import { subscribeWithSelector } from 'zustand/middleware'

const useStore = create(
  subscribeWithSelector((set) => ({ bears: 0, fish: 0 }))
)

// Subscribe to specific field
const unsub = useStore.subscribe(
  (state) => state.bears,
  (bears) => console.log('bears changed:', bears)
)
```

## Best Practices

### 1. Use Selectors for Performance

```typescript
// Good - only re-renders when bears changes
const bears = useStore((state) => state.bears)

// Bad - re-renders on any state change
const { bears } = useStore()
```

### 2. Keep Actions in the Store

```typescript
// Good - actions with state
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

// Avoid - external functions lose access to state
const increment = () => {} // Can't access state
```

### 3. Use TypeScript Interfaces

```typescript
interface StoreState {
  count: number
  increment: () => void
}

const useStore = create<StoreState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

### 4. Use Middleware Appropriately

- **devtools:** Always use in development for debugging
- **persist:** Use for user preferences, not for all state
- **immer:** Use when working with deeply nested objects

## Comparison to Redux

**Advantages of Zustand:**
- ✅ Much less boilerplate
- ✅ No providers needed
- ✅ Hook-based consumption
- ✅ Smaller bundle size (~1KB vs ~15KB)
- ✅ Simpler learning curve
- ✅ Supports transient updates without re-renders

**When to use Redux instead:**
- Large enterprise applications with complex requirements
- Teams already invested in Redux ecosystem
- Need for Redux-specific middleware

## Vanilla Store Usage

Zustand works without React through `createStore` from `zustand/vanilla`:

```typescript
import { createStore } from 'zustand/vanilla'

const store = createStore((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
}))

const { getState, setState, subscribe } = store

// Use outside React
console.log(getState().bears) // 0
setState({ bears: 5 })
const unsub = subscribe(console.log)
```

## Common Patterns for RGFX Hub

### Driver State Management

```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface DriverState {
  drivers: Driver[]
  systemStatus: SystemStatus

  // Actions
  driverConnected: (driver: Driver) => void
  driverDisconnected: (driver: Driver) => void
  updateSystemStatus: (status: SystemStatus) => void

  // Selectors
  connectedDrivers: () => Driver[]
}

export const useDriverStore = create<DriverState>()(
  devtools(
    persist(
      (set, get) => ({
        drivers: [],
        systemStatus: { /* ... */ },

        driverConnected: (driver) =>
          set((state) => {
            const exists = state.drivers.find(d => d.id === driver.id)
            return {
              drivers: exists
                ? state.drivers.map(d => d.id === driver.id ? driver : d)
                : [...state.drivers, driver]
            }
          }),

        driverDisconnected: (driver) =>
          set((state) => ({
            drivers: state.drivers.map(d => d.id === driver.id ? driver : d)
          })),

        updateSystemStatus: (status) =>
          set({ systemStatus: status }),

        connectedDrivers: () => get().drivers.filter(d => d.connected),
      }),
      { name: 'rgfx-driver-storage' }
    )
  )
)
```

### Usage in Components

```typescript
// Select specific state
const drivers = useDriverStore((state) => state.drivers)
const systemStatus = useDriverStore((state) => state.systemStatus)

// Select actions
const driverConnected = useDriverStore((state) => state.driverConnected)

// Wire to IPC
useEffect(() => {
  window.rgfx.onDriverConnected(driverConnected)
}, [driverConnected])
```

## Resources

- **Documentation:** https://zustand.docs.pmnd.rs/
- **GitHub:** https://github.com/pmndrs/zustand
- **Examples:** https://github.com/pmndrs/zustand/tree/main/examples
