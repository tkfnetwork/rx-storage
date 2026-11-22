# RxStorage
RxStorage is a simple wrapper class for anything that extends the [`Storage` interface](https://developer.mozilla.org/en-US/docs/Web/API/Storage) so that they can be subscribed to in the RxJS world.

## Installation

**NPM**

```
$ npm i @tkfnetwork/rx-storage rxjs
```

`rxjs` (^7.8) is a peer dependency.

**yarn**

```
$ yarn add @tkfnetwork/rx-storage
```

**PNPM**

```
$ pnpm add @tkfnetwork/rx-storage
```

## Usage

Using this helper class is fairly simple...

### Creation

Create your wrapped storage class

```ts
const localStore = new RxStorage(localStorage);
const sessionStore = new RxStorage(sessionStorage);
```
### Observing

You can now observe storage keys by doing the following

```ts
const someValue$ = localStore.getItem$(key);
  
someValue$.subscribe(value => {
    console.log(value) // Will emit the value when it changes
});

// Setting a value into the storage as normal
// will emit the value to any subscribers.
// Removing it (or clearing the storage) emits `null`.
localStore.setItem(key, value);
localStore.removeItem(key);
```

You can still get the storage as normal

```ts
const someValue = localStore.getItem(key);
```

### Other tabs/windows/frames
RxStorage class automatically listens for storage changes in
other tabs and windows and will automatically sync changes
into your active instance. Events for other storage areas
(e.g. `sessionStorage` events on a `localStorage` wrapper)
are ignored.

### Cleanup

When you no longer need an instance, call `cleanup()` to remove
the `storage` event listener and complete every observable
returned from `getItem$`.

```ts
localStore.cleanup();
```

## Development

```
$ npm run build      # Vite library build (ESM + CJS) + type declarations
$ npm test           # Vitest
$ npm run coverage   # Vitest with v8 coverage
$ npm run lint
$ npm run typecheck
```