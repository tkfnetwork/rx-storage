import { TestScheduler } from 'rxjs/testing';
import { RxStorage } from './RxStorage';
import { Observable } from 'rxjs';

const createTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

let testScheduler = createTestScheduler();

// Set some initial values
const initialItems: [string, string][] = [
  ['foo', 'bar'],
  ['bar', 'foo'],
];

beforeEach(() => {
  // Resets the test scheduler
  testScheduler = createTestScheduler();

  // Clear and reset localstorage
  localStorage.clear();
  initialItems.forEach((item) => {
    localStorage.setItem(...item);
  });
});

test('instance is prepopulated on creation', () => {
  const testLocalStore = new RxStorage(localStorage);

  initialItems.forEach(([key, value]) => {
    expect(testLocalStore.getItem(key)).toBe(value);
    expect(testLocalStore.getItem$(key)).toBeInstanceOf(Observable);
  });

  expect(testLocalStore).toHaveLength(2);
});

test('subscribing works as expected', () => {
  const testLocalStore = new RxStorage(localStorage);

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
  const testLocalStore = new RxStorage(localStorage);
  expect(testLocalStore).toHaveLength(2);

  localStorage.clear();
  localStorage.setItem('new item', 'value');

  testLocalStore.sync(localStorage);

  expect(testLocalStore).toHaveLength(1);
});

test('sync implictly uses the initial storage by default', () => {
  const testLocalStore = new RxStorage(localStorage);
  expect(testLocalStore).toHaveLength(2);

  localStorage.clear();
  localStorage.setItem('new item', 'value');

  testLocalStore.sync();

  expect(testLocalStore).toHaveLength(1);
});

test('clear works as expected', () => {
  const testLocalStore = new RxStorage(localStorage);
  expect(testLocalStore).toHaveLength(2);

  testLocalStore.clear();

  expect(testLocalStore).toHaveLength(0);
  expect(localStorage).toHaveLength(0);
});

test('removeItem works as expected', () => {
  const testLocalStore = new RxStorage(localStorage);
  expect(testLocalStore).toHaveLength(2);

  testLocalStore.removeItem('foo');
  expect(testLocalStore).toHaveLength(1);
});

test('key works as expected', () => {
  const testLocalStore = new RxStorage(localStorage);

  expect(testLocalStore.key(1)).toBe('bar');
});

test("getItem$ returns an observable with null even if key doesn't exist", () => {
  const testLocalStore = new RxStorage(localStorage);
  testScheduler.run(({ expectObservable }) => {
    const source$ = testLocalStore.getItem$('non existant key');

    expectObservable(source$).toBe('a', { a: null });
  });
});

test('storage event triggers sync', async () => {
  const testLocalStore = new RxStorage(localStorage);

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

  testScheduler.run(({ expectObservable }) => {
    const source$ = testLocalStore.getItem$('new1');

    expectObservable(source$).toBe('a', { a: 'foo' });
  });
});
