/**
 * Custom AG Grid cell editor for date columns.
 * Renders a native HTML date input with Enter/Escape key support.
 */

import { useState, useRef } from 'react';

// Custom cell editor for date type
export const DateCellEditor = (props: any) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(props.value || '');

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            props.stopEditing();
        }
        if (event.key === 'Escape') {
            props.stopEditing(true);
        }
    };

    return (
        <input
            ref={inputRef}
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full h-full bg-dark-elevated border-0 text-text-primary px-2"
            autoFocus
        />
    );
};
