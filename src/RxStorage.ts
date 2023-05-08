import { BehaviorSubject, Observable } from 'rxjs';

/**
 * RxStorage
 *
 * Wrapper class for browser Storage instances
 * that will sync data in to observables
 *
 */
export class RxStorage {
  private $ = new Map<string, BehaviorSubject<string | null>>();

  /**
   * This class follows the Storage class pattern
   * but does not extend it as it has no constructor
   * causing an error to be thrown that super() has not
   * been called, but adding that will result in a type
   * error saying that super can not be called on Storage
   *
   * @param storage
   */

  constructor(private storage: Storage) {
    this.listen();

    // Prepopulate on creation
    this.$ = new Map<string, BehaviorSubject<string | null>>(
      Object.entries(storage).map(([key, value]) => [key, new BehaviorSubject(value)])
    );

    return this;
  }

  /**
   * Listen for changes from other sources
   * and from other windows/tabs/frames
   */
  private listen = () => {
    window.addEventListener('storage', (e) => {
      console.log({ e });
      this.sync(e.storageArea);
    });
  };

  /**
   * Syncronises the storage instance with
   * this RxStorage instance by adding/removing
   * any items that are missing.  This can be called
   * with a storage instance parameter to syncronise
   * this RxStorage instance with that storage
   * instance data
   *
   * @param storage
   */
  public sync(storage?: Storage | null) {
    const store = storage ?? this.storage;
    const keys = Object.keys(store);
    const mapKeys = [...this.$.keys()];

    console.log('keys', keys);

    // We have to check for and remove keys that
    // no longer exist as they will be out of sync
    // at this point
    mapKeys
      .filter((key) => !keys.includes(key))
      .forEach((key) => {
        this.removeItem$(key);
      });

    Object.entries(store).forEach(([key, value]) => {
      this.setItem$(key, value);
    });
  }

  /** Storage Methods **/

  get length() {
    return this.$.size;
  }

  public clear(): void {
    this.clear$();
    this.storage.clear();
  }

  public setItem(key: string, value: string): void {
    this.setItem$(key, value);
    this.storage.setItem(key, value);
  }

  public getItem(key: string): string | null {
    this.getItem$(key);
    return this.storage.getItem(key);
  }

  public removeItem(key: string): void {
    this.removeItem$(key);
    this.storage.removeItem(key);
  }

  public key(i: number): string | null {
    return this.storage.key(i);
  }

  /** RX Methods **/

  /**
   * Internal method for setting a value
   * into the observable that relates to
   * the storage object.  This shouldn't
   * be public or called. You should always
   * call RxStorage::setItem(...)
   *
   * @param key
   * @param value
   */
  private setItem$(key: string, value: string): void {
    if (!this.$.has(key)) {
      this.$.set(key, new BehaviorSubject<string | null>(value));
    } else {
      this.$.get(key)!.next(value);
    }
  }

  /**
   * Internal method to remove a key from
   * this instances map
   *
   * @param key
   */
  private removeItem$(key: string): void {
    this.$.delete(key);
  }

  /**
   * Internal method to clear the instance map
   */
  private clear$(): void {
    this.$ = new Map<string, BehaviorSubject<string | null>>();
  }

  /**
   * Returns the storage key's value as an
   * observable so that it can be subscribed
   * to. This is the equivelant of Storage::getItem
   *
   * @param key
   */
  public getItem$(key: string): Observable<string | null> {
    if (!this.$.has(key)) {
      this.$.set(key, new BehaviorSubject<string | null>(null));
    }

    return this.$.get(key)!.asObservable();
  }
}
