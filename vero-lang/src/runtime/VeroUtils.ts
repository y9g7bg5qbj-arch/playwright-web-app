// String utilities
export const veroString = {
    uppercase: (s: string): string => String(s).toUpperCase(),
    lowercase: (s: string): string => String(s).toLowerCase(),
    trim: (s: string): string => String(s).trim(),
    substring: (s: string, start: number, end?: number): string => String(s).substring(start, end),
    replace: (s: string, search: string, replacement: string): string => String(s).split(search).join(replacement),
    split: (s: string, delimiter: string): string[] => String(s).split(delimiter),
    join: (arr: string[], delimiter: string): string => arr.join(delimiter),
    length: (s: string): number => String(s).length,
    padStart: (s: string, length: number, padChar = ' '): string => String(s).padStart(length, padChar),
    padEnd: (s: string, length: number, padChar = ' '): string => String(s).padEnd(length, padChar),
    contains: (s: string, search: string): boolean => String(s).includes(search),
    startsWith: (s: string, prefix: string): boolean => String(s).startsWith(prefix),
    endsWith: (s: string, suffix: string): boolean => String(s).endsWith(suffix),
};

// Date utilities
export const veroDate = {
    today: (): string => new Date().toISOString().split('T')[0],

    now: (): string => new Date().toISOString().replace('T', ' ').substring(0, 19),

    addDays: (date: string, days: number): string => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    },

    subtractDays: (date: string, days: number): string => veroDate.addDays(date, -days),

    addMonths: (date: string, months: number): string => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
    },

    subtractMonths: (date: string, months: number): string => veroDate.addMonths(date, -months),

    addYears: (date: string, years: number): string => {
        const d = new Date(date);
        d.setFullYear(d.getFullYear() + years);
        return d.toISOString().split('T')[0];
    },

    subtractYears: (date: string, years: number): string => veroDate.addYears(date, -years),

    formatDate: (date: string, format: string): string => {
        const d = new Date(date);
        const tokens: Record<string, string> = {
            'YYYY': d.getFullYear().toString(),
            'YY': d.getFullYear().toString().slice(-2),
            'MM': (d.getMonth() + 1).toString().padStart(2, '0'),
            'M': (d.getMonth() + 1).toString(),
            'DD': d.getDate().toString().padStart(2, '0'),
            'D': d.getDate().toString(),
            'HH': d.getHours().toString().padStart(2, '0'),
            'H': d.getHours().toString(),
            'mm': d.getMinutes().toString().padStart(2, '0'),
            'm': d.getMinutes().toString(),
            'ss': d.getSeconds().toString().padStart(2, '0'),
            's': d.getSeconds().toString(),
        };

        let result = format;
        const sortedKeys = Object.keys(tokens).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
            result = result.split(key).join(tokens[key]);
        }
        return result;
    },

    year: (date: string): number => new Date(date).getFullYear(),
    month: (date: string): number => new Date(date).getMonth() + 1,
    day: (date: string): number => new Date(date).getDate(),
    isBefore: (d1: string, d2: string): boolean => new Date(d1) < new Date(d2),
    isAfter: (d1: string, d2: string): boolean => new Date(d1) > new Date(d2),
    isEqual: (d1: string, d2: string): boolean =>
        new Date(d1).toISOString().split('T')[0] === new Date(d2).toISOString().split('T')[0],
};

// Number utilities
export const veroNumber = {
    round: (n: number, decimals = 0): number => {
        const factor = Math.pow(10, decimals);
        return Math.round(n * factor) / factor;
    },
    ceiling: (n: number): number => Math.ceil(n),
    floor: (n: number): number => Math.floor(n),
    abs: (n: number): number => Math.abs(n),
    formatCurrency: (n: number, currency = 'USD', locale = 'en-US'): string =>
        new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n),
    formatPercent: (n: number, decimals = 1): string => `${(n * 100).toFixed(decimals)}%`,
    formatNumber: (n: number, locale = 'en-US'): string => new Intl.NumberFormat(locale).format(n),
    clamp: (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max),
};

// Conversion utilities
export const veroConvert = {
    toNumber: (val: unknown, defaultValue = 0): number => {
        const num = Number(val);
        return isNaN(num) ? defaultValue : num;
    },
    toString: (val: unknown): string => String(val ?? ''),
    toBoolean: (val: unknown): boolean => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
            const lower = val.toLowerCase();
            return lower === 'true' || lower === 'yes' || lower === '1';
        }
        return Boolean(val);
    },
    default: <T>(val: T | null | undefined, defaultValue: T): T => val ?? defaultValue,
};

// Generation utilities
export const veroGenerate = {
    fromRegex: (pattern: string): string => {
        let result = '';
        let i = 0;

        while (i < pattern.length) {
            if (pattern[i] === '[') {
                const closeIdx = pattern.indexOf(']', i);
                if (closeIdx === -1) break;

                const charClass = pattern.substring(i + 1, closeIdx);
                const chars = expandCharClass(charClass);
                const quantifier = parseQuantifier(pattern, closeIdx + 1);
                i = quantifier.endIdx;

                for (let j = 0; j < quantifier.count; j++) {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            } else if (pattern[i] === '\\') {
                i++;
                if (i < pattern.length) {
                    result += pattern[i];
                    i++;
                }
            } else {
                result += pattern[i];
                i++;
            }
        }

        return result;
    },

    uuid: (): string => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    randomInt: (min: number, max: number): number =>
        Math.floor(Math.random() * (max - min + 1)) + min,

    randomElement: <T>(arr: T[]): T =>
        arr[Math.floor(Math.random() * arr.length)],

    randomString: (length: number, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string => {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset[Math.floor(Math.random() * charset.length)];
        }
        return result;
    },

    randomEmail: (domain = 'test.com'): string =>
        `${veroGenerate.randomString(8).toLowerCase()}@${domain}`,
};

function expandCharClass(charClass: string): string {
    let chars = '';
    let i = 0;

    while (i < charClass.length) {
        if (i + 2 < charClass.length && charClass[i + 1] === '-') {
            const start = charClass.charCodeAt(i);
            const end = charClass.charCodeAt(i + 2);
            for (let c = start; c <= end; c++) {
                chars += String.fromCharCode(c);
            }
            i += 3;
        } else {
            chars += charClass[i];
            i++;
        }
    }

    return chars;
}

function parseQuantifier(pattern: string, startIdx: number): { count: number; endIdx: number } {
    if (startIdx >= pattern.length || pattern[startIdx] !== '{') {
        return { count: 1, endIdx: startIdx };
    }

    const closeIdx = pattern.indexOf('}', startIdx);
    if (closeIdx === -1) {
        return { count: 1, endIdx: startIdx };
    }

    const quantStr = pattern.substring(startIdx + 1, closeIdx);
    if (quantStr.includes(',')) {
        const [minStr, maxStr] = quantStr.split(',');
        const min = parseInt(minStr, 10) || 0;
        const max = parseInt(maxStr, 10) || min;
        return {
            count: Math.floor(Math.random() * (max - min + 1)) + min,
            endIdx: closeIdx + 1
        };
    }
    return {
        count: parseInt(quantStr, 10) || 1,
        endIdx: closeIdx + 1
    };
}

// Combined export for easy import
export const VeroUtils = {
    string: veroString,
    date: veroDate,
    number: veroNumber,
    convert: veroConvert,
    generate: veroGenerate,
};

export default VeroUtils;
