/**
 * Custom AG Grid cell renderer for boolean columns.
 * Renders a checkbox that directly updates the cell value on toggle.
 */

// Custom cell renderer for boolean type
export const BooleanCellRenderer = (props: any) => {
    const value = props.value;
    return (
        <div className="flex items-center justify-center h-full">
            <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => {
                    props.node.setDataValue(props.column.getColId(), e.target.checked);
                }}
                className="w-4 h-4 rounded border-border-default bg-dark-elevated text-status-success focus:ring-status-success cursor-pointer"
            />
        </div>
    );
};
