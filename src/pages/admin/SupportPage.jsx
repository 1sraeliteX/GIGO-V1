import { useEffect, useState } from 'react';
import { MessageCircle, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

export default function SupportPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = () => {
    setLoading(true);
    api.admin.support.get()
      .then((data) => setWhatsappNumber(data.whatsapp_number || ''))
      .catch((error) => setMessage({ type: 'error', text: error.message }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const digits = whatsappNumber.replace(/\D/g, '');
  const isValid = digits.length >= 7 && digits.length <= 15;
  const previewHref = isValid ? `https://wa.me/${digits}` : '';

  const save = async () => {
    if (!isValid) {
      setMessage({ type: 'error', text: 'Enter a valid number including the country code (7-15 digits).' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const data = await api.admin.support.update({ whatsapp_number: whatsappNumber });
      setWhatsappNumber(data.whatsapp_number || '');
      setMessage({ type: 'success', text: 'WhatsApp support number saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono';

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Support Widget</h1>
        </div>
        <p className="text-sm text-neutral-500">
          Settings for the floating chat widget that answers visitor questions and hands over to WhatsApp.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 space-y-4 max-w-2xl">
          <label className="block text-xs text-neutral-400">
            WhatsApp number
            <input
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="234 801 234 5678"
              className={`${inputClass} mt-1`}
              inputMode="tel"
            />
            <span className="block mt-1 text-[11px] text-neutral-600">
              Include the country code. Spaces, plus signs and dashes are allowed.
            </span>
          </label>

          {previewHref && (
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Test this WhatsApp link <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {message && (
            <div
              className={`text-xs rounded-lg px-3 py-2 border flex items-center gap-1.5 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {message.type === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
              {message.text}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#fff] text-sm font-semibold rounded-lg py-2.5 transition-colors"
          >
            {saving ? 'Saving...' : 'Save number'}
          </button>

          <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 space-y-2">
            <p className="font-medium text-neutral-300">How the widget works</p>
            <p>1. The chat button appears on every page, including login and register.</p>
            <p>2. Visitors can tap answer options or type a question about the website.</p>
            <p>3. When they ask for a human, a WhatsApp button opens a chat with this number and pre-fills their question.</p>
            <p>The number is stored as digits only, so it works with the wa.me WhatsApp link format.</p>
          </div>
        </div>
      )}
    </div>
  );
}
