export default function AlertDialog({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, variant = 'info' }) {
    if (!open) return null;

    const isDestructive = variant === 'destructive';

    return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
        <div className="modal alert-dialog">
            <div className="alert-dialog-header">
                <h2>{title}</h2>
            </div>
            <div className="alert-dialog-content">
                <p>{message}</p>
            </div>
            <div className="alert-dialog-actions">
                <button className="secondary-button" onClick={onCancel}>{cancelText}</button>
                <button className={isDestructive ? 'danger-button' : 'primary-button'} onClick={onConfirm}>{confirmText}</button>
            </div>
        </div>
    </div>;
}
