/**
 * Data Generator Modal
 *
 * Modal for generating realistic test data with:
 * - Generator type selection (email, name, phone, etc.)
 * - Configurable options
 * - Preview of generated data
 */

import { useState, useCallback, useMemo } from 'react';
import { X, RefreshCw, Wand2, Mail, User, Phone, MapPin, Hash, Calendar, FileText, Check } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type GeneratorType =
    | 'email'
    | 'firstName'
    | 'lastName'
    | 'fullName'
    | 'phone'
    | 'address'
    | 'city'
    | 'country'
    | 'zipCode'
    | 'number'
    | 'date'
    | 'uuid'
    | 'custom';

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
    // Custom options
    pattern?: string;
    values?: string[];
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
    { type: 'firstName', label: 'First Name', icon: User, description: 'Common first names', category: 'personal' },
    { type: 'lastName', label: 'Last Name', icon: User, description: 'Common last names', category: 'personal' },
    { type: 'fullName', label: 'Full Name', icon: User, description: 'First and last name', category: 'personal' },
    { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone numbers in various formats', category: 'personal' },

    // Location
    { type: 'address', label: 'Address', icon: MapPin, description: 'Street addresses', category: 'location' },
    { type: 'city', label: 'City', icon: MapPin, description: 'City names', category: 'location' },
    { type: 'country', label: 'Country', icon: MapPin, description: 'Country names', category: 'location' },
    { type: 'zipCode', label: 'Zip Code', icon: MapPin, description: '5-digit zip codes', category: 'location' },

    // Numeric
    { type: 'number', label: 'Number', icon: Hash, description: 'Random numbers in range', category: 'numeric', config: { min: 1, max: 100, decimals: 0 } },
    { type: 'date', label: 'Date', icon: Calendar, description: 'Dates within range', category: 'numeric' },

    // Other
    { type: 'uuid', label: 'UUID', icon: FileText, description: 'Unique identifiers', category: 'other' },
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
    });
    const [preview, setPreview] = useState<(string | number)[]>([]);

    // Generate preview data
    const generatePreview = useCallback(() => {
        const count = Math.min(5, rowCount);
        const values: (string | number)[] = [];

        for (let i = 0; i < count; i++) {
            switch (selectedType) {
                case 'email':
                    values.push(generateEmail());
                    break;
                case 'firstName':
                    values.push(generateFirstName());
                    break;
                case 'lastName':
                    values.push(generateLastName());
                    break;
                case 'fullName':
                    values.push(generateFullName());
                    break;
                case 'phone':
                    values.push(generatePhone());
                    break;
                case 'address':
                    values.push(generateAddress());
                    break;
                case 'city':
                    values.push(generateCity());
                    break;
                case 'country':
                    values.push(generateCountry());
                    break;
                case 'zipCode':
                    values.push(generateZipCode());
                    break;
                case 'number':
                    values.push(generateNumber(config.min ?? 1, config.max ?? 100, config.decimals ?? 0));
                    break;
                case 'date':
                    values.push(generateDate(
                        new Date(config.startDate || Date.now() - 365 * 24 * 60 * 60 * 1000),
                        new Date(config.endDate || Date.now())
                    ));
                    break;
                case 'uuid':
                    values.push(generateUUID());
                    break;
                default:
                    values.push('');
            }
        }

        setPreview(values);
    }, [selectedType, config, rowCount]);

    // Generate preview on type/config change
    useMemo(() => {
        if (isOpen) {
            generatePreview();
        }
    }, [isOpen, selectedType, config, generatePreview]);

    // Generate all data
    const handleGenerate = useCallback(() => {
        const values: (string | number)[] = [];

        for (let i = 0; i < rowCount; i++) {
            switch (selectedType) {
                case 'email':
                    values.push(generateEmail());
                    break;
                case 'firstName':
                    values.push(generateFirstName());
                    break;
                case 'lastName':
                    values.push(generateLastName());
                    break;
                case 'fullName':
                    values.push(generateFullName());
                    break;
                case 'phone':
                    values.push(generatePhone());
                    break;
                case 'address':
                    values.push(generateAddress());
                    break;
                case 'city':
                    values.push(generateCity());
                    break;
                case 'country':
                    values.push(generateCountry());
                    break;
                case 'zipCode':
                    values.push(generateZipCode());
                    break;
                case 'number':
                    values.push(generateNumber(config.min ?? 1, config.max ?? 100, config.decimals ?? 0));
                    break;
                case 'date':
                    values.push(generateDate(
                        new Date(config.startDate || Date.now() - 365 * 24 * 60 * 60 * 1000),
                        new Date(config.endDate || Date.now())
                    ));
                    break;
                case 'uuid':
                    values.push(generateUUID());
                    break;
                default:
                    values.push('');
            }
        }

        onGenerate(values);
        onClose();
    }, [selectedType, config, rowCount, onGenerate, onClose]);

    if (!isOpen) return null;

    // Group options by category
    const personalOptions = GENERATOR_OPTIONS.filter(o => o.category === 'personal');
    const locationOptions = GENERATOR_OPTIONS.filter(o => o.category === 'location');
    const numericOptions = GENERATOR_OPTIONS.filter(o => o.category === 'numeric');
    const otherOptions = GENERATOR_OPTIONS.filter(o => o.category === 'other');

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <Wand2 className="w-5 h-5 text-purple-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-slate-200">Generate Test Data</h2>
                            <p className="text-xs text-slate-500">
                                Fill "{columnName}" with {rowCount} values
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-800 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left: Generator Type Selection */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-300">Data Type</h3>

                            {/* Personal */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Personal</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {personalOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = selectedType === option.type;
                                        return (
                                            <button
                                                key={option.type}
                                                onClick={() => setSelectedType(option.type)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Location</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {locationOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = selectedType === option.type;
                                        return (
                                            <button
                                                key={option.type}
                                                onClick={() => setSelectedType(option.type)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Numeric */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Numeric & Dates</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {numericOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = selectedType === option.type;
                                        return (
                                            <button
                                                key={option.type}
                                                onClick={() => setSelectedType(option.type)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Other */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Other</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {otherOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = selectedType === option.type;
                                        return (
                                            <button
                                                key={option.type}
                                                onClick={() => setSelectedType(option.type)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right: Configuration & Preview */}
                        <div className="space-y-4">
                            {/* Configuration for Number type */}
                            {selectedType === 'number' && (
                                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-medium text-slate-300">Number Options</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Min</label>
                                            <input
                                                type="number"
                                                value={config.min}
                                                onChange={(e) => setConfig({ ...config, min: Number(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Max</label>
                                            <input
                                                type="number"
                                                value={config.max}
                                                onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Decimal Places</label>
                                        <input
                                            type="number"
                                            value={config.decimals}
                                            min={0}
                                            max={4}
                                            onChange={(e) => setConfig({ ...config, decimals: Number(e.target.value) })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Configuration for Date type */}
                            {selectedType === 'date' && (
                                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-medium text-slate-300">Date Range</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={config.startDate}
                                                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={config.endDate}
                                                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-slate-300">Preview</h4>
                                    <button
                                        onClick={generatePreview}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Refresh
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {preview.map((value, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-slate-900 rounded px-3 py-1.5 text-xs text-slate-300 font-mono truncate"
                                        >
                                            {String(value)}
                                        </div>
                                    ))}
                                    {rowCount > 5 && (
                                        <p className="text-xs text-slate-500 text-center pt-1">
                                            ... and {rowCount - 5} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
                    <p className="text-xs text-slate-500">
                        This will fill all {rowCount} rows in "{columnName}"
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-sm text-white transition-colors"
                        >
                            <Check className="w-4 h-4" />
                            Generate {rowCount} Values
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DataGeneratorModal;
