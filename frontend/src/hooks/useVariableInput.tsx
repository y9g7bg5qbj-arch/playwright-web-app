import { useRef, useState, useCallback } from 'react';
import { VariableAutocomplete, Variable } from '../components/ide/VariableAutocomplete';

interface UseVariableInputOptions {
    /** Initial value */
    initialValue?: string;
    /** Available variables for autocomplete */
    variables: Variable[];
    /** Callback when value changes */
    onChange?: (value: string) => void;
}

interface UseVariableInputReturn {
    /** Current value */
    value: string;
    /** Set value programmatically */
    setValue: (value: string) => void;
    /** Props to spread on the input element */
    inputProps: {
        ref: React.RefObject<HTMLInputElement>;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onFocus: () => void;
        onBlur: () => void;
    };
    /** Props to spread on textarea element */
    textareaProps: {
        ref: React.RefObject<HTMLTextAreaElement>;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        onFocus: () => void;
        onBlur: () => void;
    };
    /** The autocomplete component to render */
    autocomplete: JSX.Element | null;
    /** Whether autocomplete is currently showing */
    isAutocompleteOpen: boolean;
}

/**
 * useVariableInput
 * 
 * A hook that provides easy integration of variable autocomplete
 * with any input or textarea element.
 * 
 * Usage:
 * ```tsx
 * const { inputProps, autocomplete } = useVariableInput({
 *   variables: availableVariables,
 *   onChange: (val) => updateNodeData('url', val)
 * });
 * 
 * return (
 *   <div className="relative">
 *     <input {...inputProps} className="..." />
 *     {autocomplete}
 *   </div>
 * );
 * ```
 */
export function useVariableInput(options: UseVariableInputOptions): UseVariableInputReturn {
    const { initialValue = '', variables, onChange } = options;

    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = useState(initialValue);
    const [isFocused, setIsFocused] = useState(false);
    const [showAutocomplete, setShowAutocomplete] = useState(false);

    // Handle value change
    const handleChange = useCallback((newValue: string) => {
        setValue(newValue);
        onChange?.(newValue);

        // Check if we should show autocomplete (contains {{ that's not closed)
        const cursorPos = inputRef.current?.selectionStart || textareaRef.current?.selectionStart || newValue.length;
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const openBrace = textBeforeCursor.lastIndexOf('{{');
        const closeBrace = textBeforeCursor.lastIndexOf('}}');

        setShowAutocomplete(openBrace > closeBrace);
    }, [onChange]);

    // Handle input change event
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        handleChange(e.target.value);
    }, [handleChange]);

    // Handle autocomplete selection
    const handleAutocompleteSelect = useCallback((newValue: string) => {
        setValue(newValue);
        onChange?.(newValue);
        setShowAutocomplete(false);

        // Focus back on input
        inputRef.current?.focus();
        textareaRef.current?.focus();
    }, [onChange]);

    // Build autocomplete element
    const autocomplete = showAutocomplete && isFocused ? (
        <VariableAutocomplete
            inputRef={inputRef.current ? inputRef : textareaRef}
            value={value}
            variables={variables}
            onSelect={handleAutocompleteSelect}
        />
    ) : null;

    return {
        value,
        setValue: handleChange,
        inputProps: {
            ref: inputRef,
            value,
            onChange: handleInputChange,
            onFocus: () => setIsFocused(true),
            onBlur: () => {
                // Delay to allow clicking on autocomplete
                setTimeout(() => setIsFocused(false), 200);
            },
        },
        textareaProps: {
            ref: textareaRef,
            value,
            onChange: handleInputChange,
            onFocus: () => setIsFocused(true),
            onBlur: () => {
                setTimeout(() => setIsFocused(false), 200);
            },
        },
        autocomplete,
        isAutocompleteOpen: showAutocomplete && isFocused,
    };
}
