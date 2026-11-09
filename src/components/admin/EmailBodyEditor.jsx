import { useEffect, useRef, useState } from 'react';
import { Bold, Eye, EyeOff, ImagePlus, Italic, Link2, Loader2, Images, X } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SAMPLE_VALUES = {
  name: 'Alex',
  plan: 'Monthly',
  days: '30',
  app_url: 'https://tradora.wealthallianceinvestments.com',
  reset_link: 'https://tradora.wealthallianceinvestments.com/reset/abc123',
};

const ACCEPTED = 'image/png,image/jpeg,image/gif,image/webp';

const toolButton = 'flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors';

function imgTag(media) {
  return `<img src="${media.url}" alt="${media.name}" width="600" style="max-width:100%;height:auto;display:block;margin:12px 0" />`;
}

export default function EmailBodyEditor({ value, onChange, placeholders = [], rows = 10, placeholder = '<p>Hello {{name}},</p>' }) {
  const toast = useToast();
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingDelete, setPendingDelete] = useState('');
  const deleteTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(deleteTimer.current), []);

  const replaceRange = (start, end, text, caretStart, caretEnd) => {
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(caretStart, caretEnd);
    });
  };

  const selection = () => {
    const ta = taRef.current;
    const start = ta ? ta.selectionStart : value.length;
    const end = ta ? ta.selectionEnd : value.length;
    return [start, end, value.slice(start, end)];
  };

  const wrapTag = (before, after) => {
    const [start, end, sel] = selection();
    replaceRange(start, end, before + sel + after, start + before.length, start + before.length + sel.length);
  };

  const insertText = (text) => {
    const [start, end] = selection();
    replaceRange(start, end, text, start + text.length, start + text.length);
  };

  const openLibrary = async () => {
    const next = !showLibrary;
    setShowLibrary(next);
    setPendingDelete('');
    if (next && media === null) {
      try {
        const d = await api.admin.email.listMedia();
        setMedia(d.media || []);
      } catch (e) {
        setMedia([]);
        setError(e.message);
      }
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const d = await api.admin.email.uploadMedia(file);
      setMedia(prev => [d.media, ...(prev || []).filter(m => m.name !== d.media.name)]);
      insertText(imgTag(d.media));
      toast.success('Image added to the email body.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = async (name) => {
    if (pendingDelete !== name) {
      setPendingDelete(name);
      window.clearTimeout(deleteTimer.current);
      deleteTimer.current = window.setTimeout(() => setPendingDelete(''), 4000);
      return;
    }
    setPendingDelete('');
    window.clearTimeout(deleteTimer.current);
    try {
      await api.admin.email.deleteMedia(name);
      setMedia(prev => (prev || []).filter(m => m.name !== name));
      toast.success('Image deleted from the library.');
    } catch (err) {
      setError(err.message);
    }
  };

  const previewHtml = () => {
    const rendered = (value || '').replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE_VALUES[k] ?? `[${k}]`);
    return [
      '<!doctype html><html><head><meta charset="utf-8"><style>',
      'body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:16px;color:#111;font-size:14px;line-height:1.6;max-width:600px;background:#fff}',
      'img{max-width:100%;height:auto}',
      'a{color:#059669}',
      '</style></head><body>',
      rendered,
      '</body></html>',
    ].join('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => wrapTag('<strong>', '</strong>')} className={toolButton} title="Bold">
          <Bold className="w-3.5 h-3.5" /> Bold
        </button>
        <button type="button" onClick={() => wrapTag('<em>', '</em>')} className={toolButton} title="Italic">
          <Italic className="w-3.5 h-3.5" /> Italic
        </button>
        <button type="button" onClick={() => wrapTag('<a href="https://">', '</a>')} className={toolButton} title="Link">
          <Link2 className="w-3.5 h-3.5" /> Link
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={toolButton} title="Upload an image and insert it here">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading…' : 'Image'}
        </button>
        <button type="button" onClick={openLibrary} className={toolButton} title="Insert a previously uploaded image">
          <Images className="w-3.5 h-3.5" /> Library
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => setShowPreview(v => !v)} className={toolButton}>
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Hide preview' : 'Preview'}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPTED} onChange={upload} className="hidden" />
      </div>

      {placeholders.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-neutral-500">Insert:</span>
          {placeholders.map(p => (
            <button key={p} type="button" onClick={() => insertText(`{{${p}}}`)}
              className="text-[11px] font-mono bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 rounded px-1.5 py-0.5 transition-colors">
              {`{{${p}}}`}
            </button>
          ))}
        </div>
      )}

      <textarea ref={taRef} value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        placeholder={placeholder} spellCheck={false}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono leading-relaxed resize-y focus:outline-none focus:border-emerald-500" />

      <p className="text-[11px] text-neutral-500">
        The body is HTML — put each paragraph in <code className="font-mono text-neutral-400">&lt;p&gt;</code> tags so spacing survives the email, and use absolute image URLs from the Library.
      </p>

      {showLibrary && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3">
          <p className="text-[11px] text-neutral-500 mb-2">
            Uploaded images live at <code className="text-neutral-400 font-mono">/uploads/email/</code> on this site and are linked by full URL, so recipients need internet access to see them. PNG, JPEG, GIF or WEBP up to 2MB. Click a thumbnail to insert it, or click its X twice to delete it.
          </p>
          {!media ? (
            <div className="flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading images…</div>
          ) : media.length === 0 ? (
            <p className="text-xs text-neutral-500">No images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {media.map(m => (
                <div key={m.name} className="relative group border border-neutral-700 hover:border-emerald-500 rounded-lg overflow-hidden bg-neutral-900 transition-colors">
                  <button type="button" onClick={() => insertText(imgTag(m))}
                    title={`Insert ${m.name}`}
                    className="block w-full">
                    <img src={m.url} alt={m.name} loading="lazy" className="w-full h-16 object-contain" />
                    <span className="block text-[10px] text-neutral-500 group-hover:text-emerald-400 px-1.5 py-1 truncate">{m.name}</span>
                  </button>
                  <button type="button" onClick={() => removeMedia(m.name)}
                    title={pendingDelete === m.name ? 'Click again to confirm delete' : `Delete ${m.name}`}
                    className={`absolute top-1 right-1 p-1 rounded-md border transition-colors ${
                      pendingDelete === m.name
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-neutral-900/80 border-neutral-700 text-neutral-400 hover:text-white hover:bg-red-600/80'
                    }`}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPreview && (
        <div className="space-y-1">
          <p className="text-[11px] text-neutral-500">Preview with sample placeholder values. Scripts are never sent or executed.</p>
          <iframe title="Email preview" sandbox="" srcDoc={previewHtml()}
            className="w-full h-80 rounded-lg border border-neutral-700 bg-white" />
        </div>
      )}

      {error && (
        <div className="text-xs rounded-lg px-3 py-2 border bg-red-500/10 border-red-500/30 text-red-400">{error}</div>
      )}
    </div>
  );
}
