/**
 * Aegis Unified Storage Utility
 * Consolidates all project-related storage items into a single key to avoid collisions
 * on shared subdomains.
 */

const STORAGE_KEY = 'aegis_data';

type StorageData = {
    cookieConsent?: boolean;
    vaultKey?: string;
    [key: string]: any;
};

const getStorageData = (storage: Storage): StorageData => {
    try {
        const item = storage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : {};
    } catch (e) {
        console.error('Error parsing storage data', e);
        return {};
    }
};

const setStorageData = (storage: Storage, data: StorageData) => {
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving storage data', e);
    }
};

export const storage = {
    local: {
        get: <K extends keyof StorageData>(key: K): StorageData[K] | undefined => {
            return getStorageData(window.localStorage)[key];
        },
        set: <K extends keyof StorageData>(key: K, value: StorageData[K]) => {
            const data = getStorageData(window.localStorage);
            data[key] = value;
            setStorageData(window.localStorage, data);
        },
        remove: (key: keyof StorageData) => {
            const data = getStorageData(window.localStorage);
            delete data[key];
            setStorageData(window.localStorage, data);
        },
        clear: () => {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    },
    session: {
        get: <K extends keyof StorageData>(key: K): StorageData[K] | undefined => {
            return getStorageData(window.sessionStorage)[key];
        },
        set: <K extends keyof StorageData>(key: K, value: StorageData[K]) => {
            const data = getStorageData(window.sessionStorage);
            data[key] = value;
            setStorageData(window.sessionStorage, data);
        },
        remove: (key: keyof StorageData) => {
            const data = getStorageData(window.sessionStorage);
            delete data[key];
            setStorageData(window.sessionStorage, data);
        },
        clear: () => {
            window.sessionStorage.removeItem(STORAGE_KEY);
        }
    }
};
