import { useEffect, useMemo, useState } from 'react';
import { Mail, Loader2, Save, Send, FlaskConical, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import EmailBodyEditor from '../../components/admin/EmailBodyEditor';

const TABS = [
  { key: 'settings', label: 'SMTP Settings' },
  { key: 'templates', label: 'Templates' },
  { key: 'send', label: 'Send Email' },
];

const inputClass = 'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';
const labelClass = 'block text-xs text-neutral-400';

const TEMPLATE_META = {
  forgot_password: { label: 'Forgot Password', placeholders: ['name', 'reset_link'] },
  welcome: { label: 'Welcome Email', placeholders: ['name', 'app_url'] },
  subscription_confirmed: { label: 'Subscription Confirmed', placeholders: ['name', 'plan', 'days'] },
};

function SettingsTab() {
  const [form, setForm] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_secure: 'tls',
    from_email: '', from_name: '', reply_to: '', is_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [message, setMessage] = useState(null);

  const set = (k) => (e) => setForm(prev => ({
    ...prev,
    [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  useEffect(() => {
    api.admin.email.getSettings()
      .then(d => setForm(prev => ({
        ...prev,
        ...d.settings,
        is_enabled: Number(d.settings.is_enabled) === 1,
        smtp_pass: d.settings.smtp_pass || '',
      })))
      .catch(e => setMessage({ type: 'error', text: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.admin.email.updateSettings(form);
      setMessage({ type: 'success', text: 'Email settings saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const d = await api.admin.email.testConnection(form);
      if (d.success) setMessage({ type: 'success', text: d.message || 'Test email sent successfully!' });
      else setMessage({ type: 'error', text: d.message || d.error || 'Test failed.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 space-y-4 max-w-2xl">
      <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${form.is_enabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
        {form.is_enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {form.is_enabled ? 'Email sending is enabled — app emails go through this SMTP server.' : 'Email sending is disabled — app emails will fall back to the server mail() function.'}
      </div>

      <div className="flex items-center gap-2">
        <input id="email_enabled" type="checkbox" checked={form.is_enabled} onChange={set('is_enabled')}
          className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer" />
        <label htmlFor="email_enabled" className="text-sm text-neutral-300 cursor-pointer select-none">Enable SMTP email sending</label>
      </div>

      <label className={labelClass}>
        SMTP host
        <input value={form.smtp_host} onChange={set('smtp_host')} placeholder="smtp.gmail.com" className={`${inputClass} mt-1 font-mono`} />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <label className={`${labelClass} min-w-0`}>
          Port
          <input value={form.smtp_port} onChange={set('smtp_port')} placeholder="587" className={`${inputClass} mt-1 font-mono`} />
        </label>
        <label className={`${labelClass} min-w-0`}>
          Encryption
          <select value={form.smtp_secure} onChange={set('smtp_secure')} className={`${inputClass} mt-1`}>
            <option value="tls">STARTTLS</option>
            <option value="ssl">SSL</option>
            <option value="">None</option>
          </select>
        </label>
      </div>

      <label className={labelClass}>
        SMTP username
        <input value={form.smtp_user} onChange={set('smtp_user')} placeholder="you@gmail.com" className={`${inputClass} mt-1 font-mono`} autoComplete="off" />
      </label>

      <label className={labelClass}>
        SMTP password
        <div className="relative mt-1">
          <input type={showPass ? 'text' : 'password'} value={form.smtp_pass} onChange={set('smtp_pass')}
            placeholder="Leave •••••••• to keep the stored password" className={`${inputClass} pr-10 font-mono`} autoComplete="new-password" />
          <button type="button" onClick={() => setShowPass(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <label className={`${labelClass} min-w-0`}>
          From email
          <input value={form.from_email} onChange={set('from_email')} placeholder="no-reply@tradora.com" className={`${inputClass} mt-1 font-mono`} />
        </label>
        <label className={`${labelClass} min-w-0`}>
          From name
          <input value={form.from_name} onChange={set('from_name')} placeholder="Tradora" className={`${inputClass} mt-1`} />
        </label>
      </div>

      <label className={labelClass}>
        Reply-to (optional)
        <input value={form.reply_to} onChange={set('reply_to')} placeholder="support@tradora.com" className={`${inputClass} mt-1 font-mono`} />
      </label>

      {message && (
        <div className={`text-xs rounded-lg px-3 py-2 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#fff] text-sm font-semibold rounded-lg py-2.5 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        <button onClick={test} disabled={testing || !form.smtp_host || !form.from_email}
          className="flex items-center gap-2 px-4 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 text-sm rounded-lg transition-colors">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
          {testing ? 'Sending…' : 'Send test email'}
        </button>
      </div>

      <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 space-y-1.5">
        <p className="font-medium text-neutral-300">Notes</p>
        <p>For Gmail, use an <span className="text-neutral-400">App Password</span> (Google Account → Security → 2-Step Verification → App passwords), not your normal password.</p>
        <p>The test button sends a message to the “From email” address so you can verify credentials without emailing a user.</p>
        <p>Save settings before running a test — the test uses the values currently in this form.</p>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin.email.listTemplates()
      .then(d => setTemplates(d.templates || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const edit = (key) => (field) => (e) =>
    setTemplates(prev => prev.map(t => (t.template_key === key ? { ...t, [field]: e.target.value } : t)));

  const setBody = (key) => (body) =>
    setTemplates(prev => prev.map(t => (t.template_key === key ? { ...t, body } : t)));

  const save = async (key) => {
    const t = templates.find(x => x.template_key === key);
    setSavingKey(key);
    setError('');
    try {
      await api.admin.email.updateTemplate(key, { subject: t.subject, body: t.body });
      toast.success(`${(TEMPLATE_META[key] || {}).label || key} saved.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-5 max-w-3xl">
      <p className="text-xs text-neutral-500">
        Edit the subject and body of emails the app sends automatically. Keep placeholders like{' '}
        <code className="bg-neutral-800 text-emerald-400 rounded px-1.5 py-0.5 font-mono">{'{{name}}'}</code> in the body —
        the app replaces them with real values when sending. The body is HTML: use the toolbar to add formatting or insert images.
      </p>

      {error && <div className="text-xs rounded-lg px-3 py-2 border bg-red-500/10 border-red-500/30 text-red-400">{error}</div>}

      {templates.map(t => {
        const meta = TEMPLATE_META[t.template_key] || { label: t.template_key, placeholders: [] };
        return (
        <div key={t.template_key} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{meta.label}</p>
            <code className="text-[10px] text-neutral-500 bg-neutral-800 rounded px-2 py-0.5 font-mono">{t.template_key}</code>
          </div>
          <label className={labelClass}>
            Subject
            <input value={t.subject || ''} onChange={edit(t.template_key)('subject')} className={`${inputClass} mt-1`} />
          </label>
          <div>
            <p className={labelClass}>Body</p>
            <div className="mt-1">
              <EmailBodyEditor
                value={t.body || ''}
                onChange={setBody(t.template_key)}
                placeholders={meta.placeholders}
                rows={10}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => save(t.template_key)} disabled={savingKey === t.template_key}
              className="flex items-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#fff] text-sm font-semibold rounded-lg py-2 transition-colors">
              {savingKey === t.template_key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingKey === t.template_key ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

function SendTab() {
  const { success } = useToast();
  const [recipients, setRecipients] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('user');
  const [userId, setUserId] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin.users.list({ limit: 100 })
      .then(d => setRecipients(d.users || []))
      .catch(e => setError(e.message))
      .finally(() => setLoadingUsers(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return recipients;
    return recipients.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [recipients, search]);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      if (mode === 'user') {
        if (!userId) throw new Error('Select a user first.');
        await api.admin.email.sendToUser({ user_id: Number(userId), subject, body });
        const u = recipients.find(x => String(x.id) === userId);
        success(`Email sent to ${u?.email || 'user'}.`);
      } else {
        await api.admin.email.send({ to: toEmail, subject, body });
        success(`Email sent to ${toEmail}.`);
      }
      setSubject('');
      setBody('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 space-y-4 max-w-2xl">
      <div className="flex gap-1 bg-neutral-800 rounded-lg p-1 text-sm w-fit">
        {[['user', 'To a user'], ['direct', 'To any email']].map(([key, label]) => (
          <button key={key} onClick={() => setMode(key)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${mode === key ? 'bg-emerald-600 text-[#fff]' : 'text-neutral-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'user' ? (
        <div className="space-y-2">
          <label className={labelClass}>
            Search users
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email…" className={`${inputClass} mt-1`} />
          </label>
          {loadingUsers ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading users…</div>
          ) : (
            <select value={userId} onChange={e => setUserId(e.target.value)} className={`${inputClass} mt-1`}>
              <option value="">— Select a user —</option>
              {filtered.map(u => (
                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
              ))}
            </select>
          )}
          {userId && (
            <p className="text-[11px] text-neutral-500">Will be sent to: <span className="text-neutral-300 break-all">{recipients.find(u => String(u.id) === userId)?.email}</span></p>
          )}
        </div>
      ) : (
        <label className={labelClass}>
          Recipient email
          <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="user@example.com" className={`${inputClass} mt-1 font-mono`} />
        </label>
      )}

      <label className={labelClass}>
        Subject
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" className={`${inputClass} mt-1`} />
      </label>

      <div>
        <p className={labelClass}>Message</p>
        <div className="mt-1">
          <EmailBodyEditor value={body} onChange={setBody} rows={8} placeholder="<p>Hello,</p>" />
        </div>
      </div>

      {error && <div className="text-xs rounded-lg px-3 py-2 border bg-red-500/10 border-red-500/30 text-red-400">{error}</div>}

      <button onClick={send} disabled={sending || !subject.trim()}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#fff] text-sm font-semibold rounded-lg py-2.5 transition-colors">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? 'Sending…' : 'Send email'}
      </button>

      <p className="text-[11px] text-neutral-500">Uses the SMTP settings above. If SMTP is disabled or misconfigured, sending will fail.</p>
    </div>
  );
}

function Loading() {
  return <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
}

export default function EmailPage() {
  const [tab, setTab] = useState('settings');

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Email</h1>
        </div>
        <p className="text-sm text-neutral-500">
          Configure SMTP, edit the emails Tradora sends automatically, and send messages to users.
        </p>
      </div>

      <div className="flex gap-1 mb-6 bg-neutral-900 border border-neutral-800 rounded-lg p-1 text-sm w-fit max-w-full overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tab === t.key ? 'bg-emerald-600 text-[#fff]' : 'text-neutral-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'settings' && <SettingsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'send' && <SendTab />}
    </div>
  );
}
