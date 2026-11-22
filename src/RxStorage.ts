import { BehaviorSubject, type Observable } from 'rxjs';

/**
 * RxStorage
 *
 * Wrapper class for browser Storage instances
 * that will sync data in to observables.
 *
 * The underlying storage is always the source of truth;
 * observables are created lazily per key and kept alive
 * for the lifetime of the instance so that subscribers
 * keep receiving values across removals and clears.
 */
export class RxStorage {
  private readonly subjects = new Map<string, BehaviorSubject<string | null>>();

  /**
   * This class follows the Storage class pattern
   * but does not extend it as Storage has no usable
   * constructor.
   *
   * @param storage
   */
  constructor(private readonly storage: Storage) {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageEvent);
    }
  }

  /**
   * Stops listening for cross-document storage events
   * and completes all observables returned by `getItem$`.
   */
  public cleanup(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageEvent);
    }

    this.subjects.forEach((subject) => subject.complete());
    this.subjects.clear();
  }

  /**
   * Storage event handler. Only reacts to events for
   * the storage area this instance wraps.
   *
   * @param e
   */
  private storageEvent = (e: StorageEvent): void => {
    if (e.storageArea !== this.storage) {
      return;
    }

    // `key` is null when the other document called `clear()`
    if (e.key === null) {
      this.sync();
    } else {
      this.emit(e.key, e.newValue);
    }
  };

  /**
   * Re-emits the current value of every observed key from
   * the given storage instance (defaults to the wrapped
   * storage). Keys that no longer exist emit `null`.
   *
   * @param storage
   */
  public sync(storage?: Storage | null): void {
    const store = storage ?? this.storage;

    this.subjects.forEach((_, key) => {
      this.emit(key, store.getItem(key));
    });
  }

  /** Storage Methods **/

  get length(): number {
    return this.storage.length;
  }

  public clear(): void {
    this.storage.clear();
    this.subjects.forEach((subject) => subject.next(null));
  }

  public setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
    // Read back so the emitted value matches what Storage
    // actually stored (it coerces values to strings)
    this.emit(key, this.storage.getItem(key));
  }

  public getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  public removeItem(key: string): void {
    this.storage.removeItem(key);
    this.emit(key, null);
  }

  public key(index: number): string | null {
    return this.storage.key(index);
  }

  /** RX Methods **/

  /**
   * Returns the storage key's value as an observable
   * so that it can be subscribed to. Emits the current
   * value immediately, then every distinct change.
   * This is the equivalent of Storage::getItem
   *
   * @param key
   */
  public getItem$(key: string): Observable<string | null> {
    let subject = this.subjects.get(key);

    if (!subject) {
      subject = new BehaviorSubject(this.storage.getItem(key));
      this.subjects.set(key, subject);
    }

    return subject.asObservable();
  }

  /**
   * Pushes a value to a key's observable if anything
   * is observing it and the value has changed.
   *
   * @param key
   * @param value
   */
  private emit(key: string, value: string | null): void {
    const subject = this.subjects.get(key);

    if (subject && subject.value !== value) {
      subject.next(value);
    }
  }
}
