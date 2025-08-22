/**
 * Generic localStorage utility with error handling and type safety
 */

export interface LocalStorageOptions {
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Safely get an item from localStorage
 */
export function getLocalStorageItem(key: string, options: LocalStorageOptions = {}): string | null {
  const { debug } = options;
  
  try {
    const value = localStorage.getItem(key);
    if (debug) {
      console.log(`[LocalStorage] Get '${key}':`, value);
    }
    return value;
  } catch (error) {
    if (debug) {
      console.warn(`[LocalStorage] Error getting '${key}':`, error);
    }
    return null;
  }
}

/**
 * Safely set an item in localStorage
 */
export function setLocalStorageItem(key: string, value: string, options: LocalStorageOptions = {}): boolean {
  const { debug } = options;
  
  try {
    localStorage.setItem(key, value);
    if (debug) {
      console.log(`[LocalStorage] Set '${key}':`, value);
    }
    return true;
  } catch (error) {
    if (debug) {
      console.warn(`[LocalStorage] Error setting '${key}':`, error);
    }
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 */
export function removeLocalStorageItem(key: string, options: LocalStorageOptions = {}): boolean {
  const { debug } = options;
  
  try {
    localStorage.removeItem(key);
    if (debug) {
      console.log(`[LocalStorage] Removed '${key}'`);
    }
    return true;
  } catch (error) {
    if (debug) {
      console.warn(`[LocalStorage] Error removing '${key}':`, error);
    }
    return false;
  }
}

/**
 * Get a JSON object from localStorage
 */
export function getLocalStorageJSON<T>(key: string, options: LocalStorageOptions = {}): T | null {
  const { debug } = options;
  
  try {
    const value = getLocalStorageItem(key, options);
    if (value === null) return null;
    
    const parsed = JSON.parse(value) as T;
    if (debug) {
      console.log(`[LocalStorage] Get JSON '${key}':`, parsed);
    }
    return parsed;
  } catch (error) {
    if (debug) {
      console.warn(`[LocalStorage] Error parsing JSON for '${key}':`, error);
    }
    return null;
  }
}

/**
 * Set a JSON object in localStorage
 */
export function setLocalStorageJSON<T>(key: string, value: T, options: LocalStorageOptions = {}): boolean {
  const { debug } = options;
  
  try {
    const stringified = JSON.stringify(value);
    const success = setLocalStorageItem(key, stringified, options);
    if (debug && success) {
      console.log(`[LocalStorage] Set JSON '${key}':`, value);
    }
    return success;
  } catch (error) {
    if (debug) {
      console.warn(`[LocalStorage] Error stringifying JSON for '${key}':`, error);
    }
    return false;
  }
}

/**
 * Get a Date object from localStorage (stored as ISO string)
 */
export function getLocalStorageDate(key: string, options: LocalStorageOptions = {}): Date | null {
  const { debug } = options;
  
  try {
    const value = getLocalStorageItem(key, options);
    if (value === null) return null;
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      if (debug) {
        console.warn(`[LocalStorage] Invalid date format for '${key}':`, value);
      }
      return null;
    }
    
    if (debug) {
      console.log(`[LocalStorage] Get Date '${key}':`, date);
    }
    return date;
  } catch (error) {
    if (debug) {
      console.warn(`[LocalStorage] Error parsing date for '${key}':`, error);
    }
    return null;
  }
}

/**
 * Set a Date object in localStorage (as ISO string)
 */
export function setLocalStorageDate(key: string, date: Date, options: LocalStorageOptions = {}): boolean {
  const { debug } = options;
  
  try {
    const isoString = date.toISOString();
    const success = setLocalStorageItem(key, isoString, options);
    if (debug && success) {
      console.log(`[LocalStorage] Set Date '${key}':`, date);
    }
    return success;
  } catch (error) {
    if (debug) {
      console.warn(`[LocalStorage] Error converting date for '${key}':`, error);
    }
    return false;
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all items from localStorage (use with caution)
 */
export function clearLocalStorage(options: LocalStorageOptions = {}): boolean {
  const { debug } = options;
  
  try {
    localStorage.clear();
    if (debug) {
      console.log('[LocalStorage] Cleared all items');
    }
    return true;
  } catch (error) {
    if (debug) {
      console.warn('[LocalStorage] Error clearing storage:', error);
    }
    return false;
  }
}