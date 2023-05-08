# RxStorage
RxStorage is a simple wrapper class for anything that extends the [`Storage` interface](https://developer.mozilla.org/en-US/docs/Web/API/Storage) so that they can be subscribed to in the RxJS world.

## Installation

**NPM**

```
$ npm i @tkfnetwork/rx-storage
```

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
// will emit the value to any subscribers (if the
// key already existed inside the storage instance)
localStore.setItem(key, value);
```

You can still get the storage as normal

```ts
const someValue = localStore.getItem(key);
```

### Other tabs/windows/frames
RxStorage class automatically listens for storage changes in
other tabs and windows and will automatically sync changes
into your active instance