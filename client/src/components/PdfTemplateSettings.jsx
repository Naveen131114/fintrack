import { useEffect, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { clearBusinessBrandingCache } from './DataTable';
import { getStoredUser, isBusinessOwner, isBusinessUser } from '../utils/roles';

const MAX_LOGO_BYTES = 700 * 1024;

// Logo width is stored as a % of the PDF page width; clamp to the 1-25%
// range the API accepts so the preview matches the exported header.
function normalizeLogoWidth(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(25, Math.max(1, parsed)) : 8;
}

function fileToJpegDataUrl(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const maxDim = 512;
                const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('read')); };
        img.src = url;
    });
}

export default function PdfTemplateSettings({ onClose }) {
    const user = getStoredUser();
    const canEdit = isBusinessOwner(user);
    const [form, setForm] = useState({ businessName: '', businessAddress: '', businessLogo: null, businessLogoWidthPercent: 8 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [branded, setBranded] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!isBusinessUser(user)) { setError('Business account access required'); setLoading(false); return; }
        api.business.profile.get()
            .then((profile) => {
                setForm({ businessName: profile.businessName || '', businessAddress: profile.businessAddress || '', businessLogo: profile.businessLogo || null, businessLogoWidthPercent: normalizeLogoWidth(profile.businessLogoWidthPercent) });
                setBranded(Boolean(profile.branded));
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const pickLogo = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setError(''); setMessage('');
        if (!file.type.startsWith('image/')) { setError('Please choose an image file'); return; }
        try {
            const dataUrl = await fileToJpegDataUrl(file);
            const bytes = Math.round((dataUrl.length * 3) / 4);
            if (bytes > MAX_LOGO_BYTES * 1.4) { setError('Logo image is too large. Please use an image under 700KB.'); return; }
            setForm((prev) => ({ ...prev, businessLogo: dataUrl }));
        } catch {
            setError('Could not read that image');
        }
    };

    const save = async (event) => {
        event.preventDefault();
        setError(''); setMessage('');
        setSaving(true);
        try {
            const saved = await api.business.profile.update({ businessName: form.businessName, businessAddress: form.businessAddress, businessLogo: form.businessLogo, businessLogoWidthPercent: normalizeLogoWidth(form.businessLogoWidthPercent) });
            setForm({ businessName: saved.businessName || '', businessAddress: saved.businessAddress || '', businessLogo: saved.businessLogo || null, businessLogoWidthPercent: normalizeLogoWidth(saved.businessLogoWidthPercent) });
            setBranded(Boolean(saved.branded));
            clearBusinessBrandingCache(saved.branded ? saved : null);
            setMessage('PDF template saved. Business export PDFs will carry this header.');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><div><p className="eyebrow">Settings · PDF Template</p><h2>Business PDF header</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
        {loading ? <p className="subheading">Loading template…</p> : <>
            {error && <div className="error-banner">{error}</div>}
            {message && <div className="success-banner">{message}</div>}
            {!branded && !error && <div className="error-banner">A business subscription plan is required for the branded PDF header.</div>}
            <form onSubmit={save}>
                <label>Business name<input value={form.businessName} maxLength={120} onChange={(event) => setForm({ ...form, businessName: event.target.value })} placeholder="e.g. Naveen Traders" disabled={!canEdit} /></label>
                <label>Business address<textarea rows={3} value={form.businessAddress} maxLength={600} onChange={(event) => setForm({ ...form, businessAddress: event.target.value })} placeholder="Shop No 12, Main Road, Madurai" disabled={!canEdit} /></label>
                <label>Business logo (image)<small className="field-hint">Any image works — it is converted to JPEG. Max ~700KB.</small>
                    <div className="logo-row">
                        {form.businessLogo ? <img src={form.businessLogo} alt="Business logo preview" className="logo-preview" /> : <div className="logo-preview logo-empty">No logo</div>}
                        {canEdit && <div className="logo-actions">
                            <label className="primary-button logo-upload"><ImagePlus size={15} /> Upload logo<input type="file" accept="image/*" hidden onChange={pickLogo} /></label>
                            {form.businessLogo && <button type="button" className="icon-button" title="Remove logo" onClick={() => setForm((prev) => ({ ...prev, businessLogo: null }))}><Trash2 size={15} /></button>}
                        </div>}
                    </div>
                </label>
                <label>Logo width (%)<small className="field-hint">Width of the logo as a % of the PDF page (1-25%).</small>
                    <input type="number" min={1} max={25} step={1} value={form.businessLogoWidthPercent} onChange={(event) => setForm({ ...form, businessLogoWidthPercent: event.target.value })} disabled={!canEdit} />
                </label>
                <div className="pdf-template-preview"><p className="eyebrow">PDF preview</p><div className="pdf-template-preview-card">{form.businessLogo && <img src={form.businessLogo} alt="" style={{ width: `${normalizeLogoWidth(form.businessLogoWidthPercent)}%`, height: 'auto' }} />}<div><strong>{form.businessName || 'Your business name'}</strong><span>{form.businessAddress || 'Your business address appears here'}</span></div></div></div>
                {canEdit && <button className="primary-button modal-submit" disabled={saving}>{saving ? 'Saving…' : 'Save template'}</button>}
                {!canEdit && <p className="subheading">Only the business owner can edit this template.</p>}
            </form>
        </>}
    </div></div>;
}