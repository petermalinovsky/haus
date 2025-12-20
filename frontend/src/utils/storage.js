console.log('Storage utility loading...');

const STORAGE_PREFIX = 'haus_';

export const storage = {
    save: (key, value) => {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(`${STORAGE_PREFIX}${key}`, serializedValue);
        } catch (e) {
            console.error('Error saving to localStorage', e);
        }
    },
    load: (key, defaultValue) => {
        try {
            const serializedValue = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
            if (serializedValue === null) return defaultValue;
            return JSON.parse(serializedValue);
        } catch (e) {
            console.error('Error loading from localStorage', e);
            return defaultValue;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        } catch (e) {
            console.error('Error removing from localStorage', e);
        }
    }
};
