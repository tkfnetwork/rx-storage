import { Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { RxStorage } from './RxStorage';

const createTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

let testScheduler = createTestScheduler();
let instances: RxStorage[] = [];

const createStore = (storage: Storage = localStorage) => {
  const store = new RxStorage(storage);
  instances.push(store);
  return store;
};

const collect = (source$: Observable<string | null>) => {
  const values: (string | null)[] = [];
  source$.subscribe((value) => values.push(value));
  return values;
};

// Set some initial values
const initialItems: [string, string][] = [
  ['foo', 'bar'],
  ['bar', 'foo'],
];

beforeEach(() => {
  // Resets the test scheduler
  testScheduler = createTestScheduler();

  // Clear and reset storage
  localStorage.clear();
  sessionStorage.clear();
  initialItems.forEach((item) => {
    localStorage.setItem(...item);
  });
});

afterEach(() => {
  // Don't leak window listeners between tests
  instances.forEach((store) => store.cleanup());
  instances = [];
});

test('instance reflects existing storage on creation', () => {
  const testLocalStore = createStore();

  initialItems.forEach(([key, value]) => {
    expect(testLocalStore.getItem(key)).toBe(value);
    expect(testLocalStore.getItem$(key)).toBeInstanceOf(Observable);
  });

  expect(testLocalStore).toHaveLength(2);
});

test('subscribing works as expected', () => {
  const testLocalStore = createStore();

  testScheduler.run(({ cold, expectObservable }) => {
    const marble = 'a-b-c';

    const source$ = testLocalStore.getItem$('foo');

    cold('--b-c', { b: 'bar2', c: 'bar3' }).subscribe((value) =>
      testLocalStore.setItem('foo', value)
    );

    expectObservable(source$).toBe(marble, {
      // Emits original value
      a: 'bar',

      // Emits next values correctly
      b: 'bar2',
      c: 'bar3',
    });
  });
});

test('sync explicit store works as expected', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));
  const newItem = collect(testLocalStore.getItem$('new item'));

  localStorage.clear();
  localStorage.setItem('new item', 'value');

  testLocalStore.sync(localStorage);

  expect(testLocalStore).toHaveLength(1);
  expect(foo).toEqual(['bar', null]);
  expect(newItem).toEqual([null, 'value']);
});

test('sync implictly uses the initial storage by default', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));

  localStorage.clear();
  localStorage.setItem('new item', 'value');

  testLocalStore.sync();

  expect(testLocalStore).toHaveLength(1);
  expect(foo).toEqual(['bar', null]);
});

test('clear works as expected', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));

  testLocalStore.clear();

  expect(testLocalStore).toHaveLength(0);
  expect(localStorage).toHaveLength(0);
  expect(foo).toEqual(['bar', null]);
});

test('removeItem works as expected', () => {
  const testLocalStore = createStore();
  expect(testLocalStore).toHaveLength(2);

  testLocalStore.removeItem('foo');
  expect(testLocalStore).toHaveLength(1);
});

test('subscribers keep receiving values after a key is removed and re-added', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));

  testLocalStore.removeItem('foo');
  testLocalStore.setItem('foo', 'back');

  expect(foo).toEqual(['bar', null, 'back']);
});

test('setting the same value does not re-emit', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));

  testLocalStore.setItem('foo', 'bar');
  testLocalStore.setItem('foo', 'bar');

  expect(foo).toEqual(['bar']);
});

test('key works as expected', () => {
  const testLocalStore = createStore();

  expect(testLocalStore.key(1)).toBe('bar');
});

test("getItem$ returns an observable with null even if key doesn't exist", () => {
  const testLocalStore = createStore();
  testScheduler.run(({ expectObservable }) => {
    const source$ = testLocalStore.getItem$('non existant key');

    expectObservable(source$).toBe('a', { a: null });
  });
});

test('observing a missing key does not change length', () => {
  const testLocalStore = createStore();

  testLocalStore.getItem$('non existant key');
  testLocalStore.getItem('another missing key');

  expect(testLocalStore).toHaveLength(2);
});

test('getItem$ reads values written directly to storage after creation', () => {
  const testLocalStore = createStore();

  localStorage.setItem('direct', 'value');

  expect(collect(testLocalStore.getItem$('direct'))).toEqual(['value']);
});

test('storage event with no key (clear) triggers full sync', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));

  localStorage.clear();
  localStorage.setItem('new1', 'foo');

  window.dispatchEvent(
    new StorageEvent('storage', {
      storageArea: localStorage,
    })
  );

  expect(testLocalStore).toHaveLength(1);
  expect(testLocalStore.getItem('foo')).toBeNull();
  expect(testLocalStore.getItem('bar')).toBeNull();
  expect(testLocalStore.getItem('new1')).toBe('foo');
  expect(foo).toEqual(['bar', null]);

  testScheduler.run(({ expectObservable }) => {
    const source$ = testLocalStore.getItem$('new1');

    expectObservable(source$).toBe('a', { a: 'foo' });
  });
});

test('storage event for a single key emits its new value', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));

  window.dispatchEvent(
    new StorageEvent('storage', {
      storageArea: localStorage,
      key: 'foo',
      oldValue: 'bar',
      newValue: 'from another tab',
    })
  );

  expect(foo).toEqual(['bar', 'from another tab']);
});

test('storage events for other storage areas are ignored', () => {
  const testLocalStore = createStore();
  const foo = collect(testLocalStore.getItem$('foo'));

  sessionStorage.setItem('foo', 'session value');

  window.dispatchEvent(
    new StorageEvent('storage', {
      storageArea: sessionStorage,
      key: 'foo',
      newValue: 'session value',
    })
  );
  window.dispatchEvent(new StorageEvent('storage', { storageArea: sessionStorage }));

  expect(foo).toEqual(['bar']);
});

test('cleanup completes observables and stops listening', () => {
  const testLocalStore = createStore();
  let completed = false;
  const values: (string | null)[] = [];

  testLocalStore.getItem$('foo').subscribe({
    next: (value) => values.push(value),
    complete: () => (completed = true),
  });

  testLocalStore.cleanup();

  window.dispatchEvent(
    new StorageEvent('storage', { storageArea: localStorage, key: 'foo', newValue: 'x' })
  );

  expect(completed).toBe(true);
  expect(values).toEqual(['bar']);
});
