/**
 * Data Generator Modal
 *
 * Modal for generating realistic test data with:
 * - Generator type selection (email, name, phone, etc.)
 * - Configurable options
 * - Preview of generated data
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    RefreshCw,
    Mail,
    User,
    Phone,
    MapPin,
    Hash,
    Calendar,
    FileText,
    Check,
    Building2,
    Globe,
    ToggleLeft,
    LetterText,
    AtSign,
} from 'lucide-react';
import { Modal, Button } from '@/components/ui';

// ============================================
// TYPES
// ============================================

export type GeneratorType =
    | 'email'
    | 'username'
    | 'firstName'
    | 'lastName'
    | 'fullName'
    | 'phone'
    | 'company'
    | 'address'
    | 'city'
    | 'country'
    | 'zipCode'
    | 'status'
    | 'number'
    | 'date'
    | 'boolean'
    | 'url'
    | 'sentence'
    | 'uuid'
    | 'customList';

interface GeneratorOption {
    type: GeneratorType;
    label: string;
    icon: typeof Mail;
    description: string;
    category: 'personal' | 'location' | 'numeric' | 'other';
    config?: GeneratorConfig;
}

interface GeneratorConfig {
    // Number options
    min?: number;
    max?: number;
    decimals?: number;
    // Date options
    startDate?: string;
    endDate?: string;
    // List / boolean options
    values?: string[];
    truePercentage?: number;
}

interface DataGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    columnName: string;
    rowCount: number;
    onGenerate: (values: (string | number | boolean)[]) => void;
}

// ============================================
// DATA GENERATORS
// ============================================

// Sample data for realistic generation
const FIRST_NAMES = [
    'James', 'Emma', 'William', 'Olivia', 'Benjamin', 'Ava', 'Lucas', 'Sophia',
    'Henry', 'Isabella', 'Alexander', 'Mia', 'Sebastian', 'Charlotte', 'Jack',
    'Amelia', 'Owen', 'Harper', 'Daniel', 'Evelyn', 'Michael', 'Abigail',
    'Ethan', 'Emily', 'Noah', 'Elizabeth', 'Liam', 'Sofia', 'Mason', 'Avery'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com',
    'test.com', 'company.com', 'mail.com', 'email.com', 'work.org'
];

const CITIES = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Indianapolis', 'Charlotte', 'Seattle', 'Denver',
    'Boston', 'Portland', 'Miami', 'Atlanta', 'Detroit', 'Minneapolis'
];

const COUNTRIES = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France',
    'Japan', 'Brazil', 'India', 'Mexico', 'Spain', 'Italy', 'Netherlands', 'Sweden'
];

const STREET_PREFIXES = ['', 'North', 'South', 'East', 'West'];
const STREET_TYPES = ['Street', 'Avenue', 'Boulevard', 'Drive', 'Lane', 'Road', 'Way', 'Court'];
const COMPANY_SUFFIXES = ['Inc', 'LLC', 'Group', 'Corp', 'Labs', 'Technologies', 'Systems', 'Partners'];
const STATUS_VALUES = ['active', 'inactive', 'pending', 'blocked', 'archived'];
const URL_PATH_SEGMENTS = ['dashboard', 'settings', 'profile', 'orders', 'billing', 'reports', 'projects', 'users'];
const SENTENCE_WORDS = [
    'automated',
    'quality',
    'pipeline',
    'session',
    'workflow',
    'table',
    'record',
    'scenario',
    'validation',
    'release',
    'review',
    'monitoring',
    'insight',
    'coverage',
    'execution',
    'engine',
];

// Utility functions
function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(): string {
    const first = randomElement(FIRST_NAMES).toLowerCase();
    const last = randomElement(LAST_NAMES).toLowerCase();
    const domain = randomElement(EMAIL_DOMAINS);
    const suffix = randomInt(1, 999);

    const formats = [
        `${first}.${last}@${domain}`,
        `${first}${last}${suffix}@${domain}`,
        `${first}_${last}@${domain}`,
        `${first.charAt(0)}${last}@${domain}`,
    ];
    return randomElement(formats);
}

function generateUsername(): string {
    const first = randomElement(FIRST_NAMES).toLowerCase();
    const last = randomElement(LAST_NAMES).toLowerCase();
    const suffix = randomInt(1, 9999);
    const formats = [
        `${first}.${last}`,
        `${first}_${last}`,
        `${first}${last}${suffix}`,
        `${first.charAt(0)}${last}${suffix}`,
    ];
    return randomElement(formats);
}

function generateFirstName(): string {
    return randomElement(FIRST_NAMES);
}

function generateLastName(): string {
    return randomElement(LAST_NAMES);
}

function generateFullName(): string {
    return `${generateFirstName()} ${generateLastName()}`;
}

function generatePhone(): string {
    const area = randomInt(200, 999);
    const exchange = randomInt(200, 999);
    const subscriber = randomInt(1000, 9999);

    const formats = [
        `(${area}) ${exchange}-${subscriber}`,
        `${area}-${exchange}-${subscriber}`,
        `+1 ${area} ${exchange} ${subscriber}`,
    ];
    return randomElement(formats);
}

function generateCompany(): string {
    const base = randomElement(LAST_NAMES);
    const suffix = randomElement(COMPANY_SUFFIXES);
    return `${base} ${suffix}`;
}

function generateAddress(): string {
    const number = randomInt(1, 9999);
    const prefix = randomElement(STREET_PREFIXES);
    const street = randomElement(LAST_NAMES);
    const type = randomElement(STREET_TYPES);

    return prefix ? `${number} ${prefix} ${street} ${type}` : `${number} ${street} ${type}`;
}

function generateCity(): string {
    return randomElement(CITIES);
}

function generateCountry(): string {
    return randomElement(COUNTRIES);
}

function generateZipCode(): string {
    return String(randomInt(10000, 99999));
}

function generateStatus(values?: string[]): string {
    const source = values && values.length > 0 ? values : STATUS_VALUES;
    return randomElement(source);
}

function generateNumber(min: number, max: number, decimals: number): number {
    if (decimals === 0) {
        return randomInt(min, max);
    }
    const num = Math.random() * (max - min) + min;
    return Number(num.toFixed(decimals));
}

function generateDate(start: Date, end: Date): string {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime).toISOString().split('T')[0];
}

function generateBoolean(truePercentage = 50): boolean {
    return Math.random() * 100 < truePercentage;
}

function generateUrl(): string {
    const domain = randomElement(EMAIL_DOMAINS).replace(/\.com$/, '.com');
    const pathA = randomElement(URL_PATH_SEGMENTS);
    const pathB = randomElement(URL_PATH_SEGMENTS);
    return `https://www.${domain}/${pathA}/${pathB}-${randomInt(1, 999)}`;
}

function generateSentence(): string {
    const wordCount = randomInt(5, 12);
    const words = Array.from({ length: wordCount }, () => randomElement(SENTENCE_WORDS));
    const sentence = words.join(' ');
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ============================================
// GENERATOR OPTIONS
// ============================================

const GENERATOR_OPTIONS: GeneratorOption[] = [
    // Personal
    { type: 'email', label: 'Email', icon: Mail, description: 'Realistic email addresses', category: 'personal' },
    { type: 'username', label: 'Username', icon: AtSign, description: 'Login-style usernames', category: 'personal' },
    { type: 'firstName', label: 'First Name', icon: User, description: 'Common first names', category: 'personal' },
    { type: 'lastName', label: 'Last Name', icon: User, description: 'Common last names', category: 'personal' },
    { type: 'fullName', label: 'Full Name', icon: User, description: 'First and last name', category: 'personal' },
    { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone numbers in various formats', category: 'personal' },
    { type: 'company', label: 'Company', icon: Building2, description: 'Company-like names', category: 'personal' },

    // Location
    { type: 'address', label: 'Address', icon: MapPin, description: 'Street addresses', category: 'location' },
    { type: 'city', label: 'City', icon: MapPin, description: 'City names', category: 'location' },
    { type: 'country', label: 'Country', icon: MapPin, description: 'Country names', category: 'location' },
    { type: 'zipCode', label: 'Zip Code', icon: MapPin, description: '5-digit zip codes', category: 'location' },
    { type: 'status', label: 'Status', icon: LetterText, description: 'Common status values', category: 'location' },

    // Numeric
    { type: 'number', label: 'Number', icon: Hash, description: 'Random numbers in range', category: 'numeric', config: { min: 1, max: 100, decimals: 0 } },
    { type: 'date', label: 'Date', icon: Calendar, description: 'Dates within range', category: 'numeric' },
    { type: 'boolean', label: 'Boolean', icon: ToggleLeft, description: 'true / false values', category: 'numeric', config: { truePercentage: 50 } },

    // Other
    { type: 'url', label: 'URL', icon: Globe, description: 'Website links', category: 'other' },
    { type: 'sentence', label: 'Sentence', icon: LetterText, description: 'Readable text snippets', category: 'other' },
    { type: 'uuid', label: 'UUID', icon: FileText, description: 'Unique identifiers', category: 'other' },
    { type: 'customList', label: 'Custom List', icon: LetterText, description: 'Pick from your own values', category: 'other' },
];

// ============================================
// COMPONENT
// ============================================

export function DataGeneratorModal({
    isOpen,
    onClose,
    columnName,
    rowCount,
    onGenerate,
}: DataGeneratorModalProps) {
    const [selectedType, setSelectedType] = useState<GeneratorType>('email');
    const [config, setConfig] = useState<GeneratorConfig>({
        min: 1,
        max: 100,
        decimals: 0,
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        values: STATUS_VALUES,
        truePercentage: 50,
    });
    const [preview, setPreview] = useState<(string | number | boolean)[]>([]);

    const parsedCustomValues = useMemo(
        () =>
            (config.values || [])
                .map((value) => value.trim())
                .filter(Boolean),
        [config.values]
    );

    const generateValueByType = useCallback(
        (type: GeneratorType): string | number | boolean => {
            switch (type) {
                case 'email':
                    return generateEmail();
                case 'username':
                    return generateUsername();
                case 'firstName':
                    return generateFirstName();
                case 'lastName':
                    return generateLastName();
                case 'fullName':
                    return generateFullName();
                case 'phone':
                    return generatePhone();
                case 'company':
                    return generateCompany();
                case 'address':
                    return generateAddress();
                case 'city':
                    return generateCity();
                case 'country':
                    return generateCountry();
                case 'zipCode':
                    return generateZipCode();
                case 'status':
                    return generateStatus(parsedCustomValues);
                case 'number':
                    return generateNumber(config.min ?? 1, config.max ?? 100, config.decimals ?? 0);
                case 'date':
                    return generateDate(
                        new Date(config.startDate || Date.now() - 365 * 24 * 60 * 60 * 1000),
                        new Date(config.endDate || Date.now())
                    );
                case 'boolean':
                    return generateBoolean(config.truePercentage ?? 50);
                case 'url':
                    return generateUrl();
                case 'sentence':
                    return generateSentence();
                case 'uuid':
                    return generateUUID();
                case 'customList':
                    return parsedCustomValues.length > 0 ? randomElement(parsedCustomValues) : '';
                default:
                    return '';
            }
        },
        [config, parsedCustomValues]
    );

    // Generate preview data
    const generatePreview = useCallback(() => {
        const count = Math.min(5, rowCount);
        const values: (string | number | boolean)[] = [];

        for (let i = 0; i < count; i++) {
            values.push(generateValueByType(selectedType));
        }

        setPreview(values);
    }, [selectedType, rowCount, generateValueByType]);

    // Generate preview on type/config change
    useEffect(() => {
        if (isOpen) {
            generatePreview();
        }
    }, [isOpen, selectedType, config, generatePreview]);

    // Generate all data
    const handleGenerate = useCallback(() => {
        const values: (string | number | boolean)[] = [];

        for (let i = 0; i < rowCount; i++) {
            values.push(generateValueByType(selectedType));
        }

        onGenerate(values);
        onClose();
    }, [selectedType, rowCount, onGenerate, onClose, generateValueByType]);

    // Group options by category
    const personalOptions = GENERATOR_OPTIONS.filter(o => o.category === 'personal');
    const locationOptions = GENERATOR_OPTIONS.filter(o => o.category === 'location');
    const numericOptions = GENERATOR_OPTIONS.filter(o => o.category === 'numeric');
    const otherOptions = GENERATOR_OPTIONS.filter(o => o.category === 'other');

    const renderOptionGroup = (options: GeneratorOption[]) => (
        <div className="grid grid-cols-2 gap-2">
            {options.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedType === option.type;
                return (
                    <button
                        key={option.type}
                        onClick={() => setSelectedType(option.type)}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                            isSelected
                                ? 'border-status-info/60 bg-status-info/20 text-text-primary'
                                : 'border-border-default bg-dark-elevated text-text-primary hover:border-border-emphasis hover:bg-dark-card'
                        }`}
                        title={option.description}
                    >
                        <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-status-info' : 'text-text-secondary'}`} />
                        {option.label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generate Test Data"
            description={`Fill "${columnName}" with ${rowCount} values`}
            size="2xl"
            bodyClassName="max-h-[70vh]"
            footer={
                <div className="flex items-center justify-between w-full">
                    <p className="text-xs text-text-secondary">
                        This will fill all {rowCount} rows in "{columnName}"
                    </p>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="action"
                            leftIcon={<Check className="w-4 h-4" />}
                            onClick={handleGenerate}
                        >
                            Generate {rowCount} Values
                        </Button>
                    </div>
                </div>
            }
        >
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left: Generator Type Selection */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-text-primary">Data Type</h3>

                            {/* Personal */}
                            <div>
                                <p className="text-xs text-text-secondary mb-2">Personal</p>
                                {renderOptionGroup(personalOptions)}
                            </div>

                            {/* Location */}
                            <div>
                                <p className="text-xs text-text-secondary mb-2">Location</p>
                                {renderOptionGroup(locationOptions)}
                            </div>

                            {/* Numeric */}
                            <div>
                                <p className="text-xs text-text-secondary mb-2">Numeric & Dates</p>
                                {renderOptionGroup(numericOptions)}
                            </div>

                            {/* Other */}
                            <div>
                                <p className="text-xs text-text-secondary mb-2">Other</p>
                                {renderOptionGroup(otherOptions)}
                            </div>
                        </div>

                        {/* Right: Configuration & Preview */}
                        <div className="space-y-4">
                            {/* Configuration for Number type */}
                            {selectedType === 'number' && (
                                <div className="bg-dark-elevated/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-medium text-text-primary">Number Options</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">Min</label>
                                            <input
                                                type="number"
                                                value={config.min}
                                                onChange={(e) => setConfig({ ...config, min: Number(e.target.value) })}
                                                className="w-full bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-xs text-text-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">Max</label>
                                            <input
                                                type="number"
                                                value={config.max}
                                                onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })}
                                                className="w-full bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-xs text-text-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">Decimal Places</label>
                                        <input
                                            type="number"
                                            value={config.decimals}
                                            min={0}
                                            max={4}
                                            onChange={(e) => setConfig({ ...config, decimals: Number(e.target.value) })}
                                            className="w-full bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-xs text-text-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Configuration for Boolean type */}
                            {selectedType === 'boolean' && (
                                <div className="bg-dark-elevated/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-medium text-text-primary">Boolean Distribution</h4>
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">True percentage</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={config.truePercentage ?? 50}
                                                onChange={(e) => setConfig({ ...config, truePercentage: Number(e.target.value) })}
                                                className="flex-1"
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={config.truePercentage ?? 50}
                                                onChange={(e) => setConfig({ ...config, truePercentage: Number(e.target.value) })}
                                                className="w-20 bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-xs text-text-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Configuration for status/custom list */}
                            {(selectedType === 'status' || selectedType === 'customList') && (
                                <div className="bg-dark-elevated/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-medium text-text-primary">
                                        {selectedType === 'status' ? 'Status Values' : 'Custom Values'}
                                    </h4>
                                    <div>
                                        <label className="block text-xs text-text-secondary mb-1">
                                            Comma-separated values
                                        </label>
                                        <textarea
                                            value={(config.values || []).join(', ')}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    values: e.target.value
                                                        .split(',')
                                                        .map((value) => value.trim())
                                                        .filter(Boolean),
                                                })
                                            }
                                            rows={3}
                                            placeholder="active, pending, blocked"
                                            className="w-full bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-xs text-text-primary"
                                        />
                                    </div>
                                    <p className="text-xxs text-text-muted">
                                        Generated values will be randomly picked from this list.
                                    </p>
                                </div>
                            )}

                            {/* Configuration for Date type */}
                            {selectedType === 'date' && (
                                <div className="bg-dark-elevated/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-medium text-text-primary">Date Range</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={config.startDate}
                                                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                                                className="w-full bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-xs text-text-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={config.endDate}
                                                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                                                className="w-full bg-dark-canvas border border-border-default rounded px-2 py-1.5 text-xs text-text-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
                            <div className="bg-dark-elevated/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-text-primary">Preview</h4>
                                    <button
                                        onClick={generatePreview}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Refresh
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {preview.map((value, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-dark-canvas rounded px-3 py-1.5 text-xs text-text-primary font-mono truncate"
                                        >
                                            {String(value)}
                                        </div>
                                    ))}
                                    {rowCount > 5 && (
                                        <p className="text-xs text-text-secondary text-center pt-1">
                                            ... and {rowCount - 5} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
        </Modal>
    );
}

export default DataGeneratorModal;
