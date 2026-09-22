import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  Download,
  History,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { VerificationResult } from '@skillseal/shared';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { TableScroll } from '@/components/ui/TableScroll';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError, api } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface HistoryEntry {
  id: string;
  certificateId: string;
  result: VerificationResult;
  channel: string;
  createdAt: string;
  holderName: string | null;
}

interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface CreatedApiKey extends ApiKeySummary {
  plaintextKey: string;
}

const RESULT_TONE: Record<VerificationResult, string> = {
  VALID: 'bg-valid-50 text-valid-700 ring-valid-100',
  EXPIRED: 'bg-warn-50 text-accent-700 ring-accent-100',
  REVOKED: 'bg-danger-50 text-danger-700 ring-danger-100',
  TAMPERED: 'bg-danger-50 text-danger-700 ring-danger-100',
  NOT_FOUND: 'bg-ink-100 text-ink-600 ring-ink-200',
};

const CHANNEL_LABEL: Record<string, string> = {
  PUBLIC_PAGE: 'Public page',
  HR_PORTAL: 'Portal',
  API: 'API',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Turns the history into a CSV the way the spec asks for elsewhere. */
function downloadCsv(rows: HistoryEntry[]): void {
  const escape = (value: string) => '"' + value.replace(/"/g, '""') + '"';
  const csv = [
    ['Certificate ID', 'Candidate', 'Result', 'Channel', 'Checked at'].join(','),
    ...rows.map((row) =>
      [
        escape(row.certificateId),
        escape(row.holderName ?? ''),
        escape(row.result),
        escape(CHANNEL_LABEL[row.channel] ?? row.channel),
        escape(new Date(row.createdAt).toISOString()),
      ].join(','),
    ),
  ].join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'verification-history-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function useCopy(): [string | null, (text: string, id: string) => void] {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(text: string, id: string) {
    const done = () => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => undefined);
      return;
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    try {
      document.execCommand('copy');
      done();
    } finally {
      document.body.removeChild(field);
    }
  }

  return [copiedId, copy];
}

/**
 * Verification history and API keys (spec screen 20).
 */
export default function HrHistoryPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedId, copy] = useCopy();
  const [newKeyName, setNewKeyName] = useState('');
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const history = useQuery<HistoryEntry[]>({
    queryKey: ['hr', 'verification-history'],
    queryFn: () => api.get<HistoryEntry[]>('/api/hr/verify/history?limit=50'),
  });

  const keys = useQuery<ApiKeySummary[]>({
    queryKey: ['hr', 'api-keys'],
    queryFn: () => api.get<ApiKeySummary[]>('/api/hr/api-keys'),
  });

  const createKey = useMutation({
    mutationFn: (name: string) => api.post<CreatedApiKey>('/api/hr/api-keys', { name }),
    onSuccess: (created) => {
      setJustCreated(created);
      setNewKeyName('');
      setFormError(null);
      toast({
        tone: 'success',
        title: 'API key created',
        description: 'Copy it now — it cannot be shown again.',
      });
      void queryClient.invalidateQueries({ queryKey: ['hr', 'api-keys'] });
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Could not create the key. Try again.',
      );
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => api.delete<{ revoked: boolean }>('/api/hr/api-keys/' + id),
    onSuccess: () => {
      toast({ tone: 'info', title: 'API key revoked' });
      return queryClient.invalidateQueries({ queryKey: ['hr', 'api-keys'] });
    },
  });

  const activeKeys = keys.data?.filter((key) => !key.revokedAt) ?? [];
  const totalCalls = keys.data?.reduce((sum, key) => sum + key.usageCount, 0) ?? 0;

  return (
    <>
      <Seo
        title="Verification history"
        description="Your past credential checks and API keys."
        path="/hr/history"
        noIndex
      />

      <div className="container-page max-w-4xl py-8 sm:py-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Verification history
            </h1>
            <p className="mt-2 text-ink-600">
              Every check you have run, and the API keys your own systems use.
            </p>
          </div>
          <Link to="/hr/verify">
            <Button>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Verify a candidate
            </Button>
          </Link>
        </header>

        {/* Usage summary ---------------------------------------------------- */}
        <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Checks recorded', value: history.data?.length ?? 0 },
            {
              label: 'Valid results',
              value: history.data?.filter((h) => h.result === 'VALID').length ?? 0,
            },
            { label: 'Active API keys', value: activeKeys.length },
            { label: 'API calls', value: totalCalls },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-ink-200"
            >
              <dt className="text-xs text-ink-500">{stat.label}</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold text-ink-900">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* History table ---------------------------------------------------- */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <History className="size-4.5 text-ink-400" aria-hidden="true" />
              Past checks
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => history.data && downloadCsv(history.data)}
              disabled={!history.data?.length}
            >
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </Button>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-ink-200">
            {history.isPending ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-ink-500">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading history…
              </div>
            ) : history.isError ? (
              <div className="p-6">
                <Alert tone="error">Could not load your verification history.</Alert>
              </div>
            ) : history.data.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-ink-600">You have not verified any candidates yet.</p>
                <Link to="/hr/verify" className="mt-3 inline-block">
                  <Button size="sm" variant="secondary">
                    Run your first check
                  </Button>
                </Link>
              </div>
            ) : (
              <TableScroll label="Verification history">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink-200 bg-ink-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold text-ink-600">
                        Certificate
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-ink-600">
                        Candidate
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-ink-600">
                        Result
                      </th>
                      <th scope="col" className="hidden px-4 py-3 font-semibold text-ink-600 sm:table-cell">
                        Via
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-ink-600">
                        Checked
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-200">
                    {history.data.map((entry) => (
                      <tr key={entry.id} className="transition hover:bg-ink-50">
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            to={'/verify/' + entry.certificateId}
                            className="font-mono text-xs text-brand-700 hover:underline"
                          >
                            {entry.certificateId}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink-700">{entry.holderName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset',
                              RESULT_TONE[entry.result],
                            )}
                          >
                            {entry.result.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-ink-500 sm:table-cell">
                          {CHANNEL_LABEL[entry.channel] ?? entry.channel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                          {formatDateTime(entry.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </div>
        </section>

        {/* API keys --------------------------------------------------------- */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <KeyRound className="size-4.5 text-ink-400" aria-hidden="true" />
            API keys
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Wire verification straight into your ATS. Send the key as an{' '}
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">x-api-key</code>{' '}
            header.
          </p>

          {/* The one and only time the plaintext key is shown. */}
          {justCreated && (
            <div className="mt-4 rounded-2xl bg-valid-50 p-5 ring-1 ring-inset ring-valid-100">
              <h3 className="flex items-center gap-2 text-sm font-bold text-valid-700">
                <Check className="size-4" aria-hidden="true" />
                Key created — copy it now
              </h3>
              {/* Plain class, no opacity modifier: the /90 form compiles to a
                  different class that the dark-theme text remap misses. */}
              <p className="mt-1 text-xs text-valid-700">
                This is the only time the full key is shown. We store only a hash, so it cannot be
                retrieved again.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2.5 font-mono text-xs text-ink-800 ring-1 ring-inset ring-valid-200">
                  {justCreated.plaintextKey}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copy(justCreated.plaintextKey, justCreated.id)}
                >
                  {copiedId === justCreated.id ? (
                    <Check className="size-4 text-valid-600" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copiedId === justCreated.id ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setJustCreated(null)}
                className="mt-3 text-xs font-semibold text-valid-700 underline underline-offset-2"
              >
                I have saved it — hide this
              </button>
            </div>
          )}

          {/* Create form */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (newKeyName.trim()) createKey.mutate(newKeyName.trim());
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <TextField
              label="New key name"
              placeholder="ATS integration"
              value={newKeyName}
              onChange={(event) => setNewKeyName(event.target.value)}
              error={formError ?? undefined}
              containerClassName="flex-1"
            />
            <Button
              type="submit"
              isLoading={createKey.isPending}
              loadingText="Creating…"
              disabled={!newKeyName.trim()}
              className="sm:mb-0"
            >
              <Plus className="size-4" aria-hidden="true" />
              Generate key
            </Button>
          </form>

          {/* Key list */}
          <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-ink-200">
            {keys.isPending ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-ink-500">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading keys…
              </div>
            ) : keys.data?.length ? (
              <ul className="divide-y divide-ink-200">
                {keys.data.map((key) => (
                  <li
                    key={key.id}
                    className={cn(
                      'flex flex-wrap items-center justify-between gap-3 px-4 py-3.5',
                      key.revokedAt && 'opacity-60',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                        {key.name}
                        {key.revokedAt && (
                          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                            Revoked
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-ink-500">
                        {key.keyPrefix}
                        {'…'.repeat(1)}
                        <span className="tracking-widest">••••••••</span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {key.usageCount} call{key.usageCount === 1 ? '' : 's'}
                        {key.lastUsedAt
                          ? ' · last used ' + formatDateTime(key.lastUsedAt)
                          : ' · never used'}
                      </p>
                    </div>

                    {!key.revokedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeKey.mutate(key.id)}
                        isLoading={revokeKey.isPending && revokeKey.variables === key.id}
                        className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Revoke
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-sm text-ink-600">
                No API keys yet. Generate one to start verifying from your own systems.
              </div>
            )}
          </div>

          {/* Alert renders its own icon — do not add a second one here. */}
          <Alert tone="warning" className="mt-4">
            Treat keys like passwords. Anyone holding one can run verifications billed to your
            organisation — revoke immediately if a key leaks.
          </Alert>

          {/* Usage example */}
          <div className="palette-light mt-5 overflow-hidden rounded-xl bg-ink-900">
            <div className="border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-xs text-ink-400">Example request</span>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-xs leading-relaxed text-ink-300">
              <code>
                curl https://api.skillseal.example.org/api/verify/SS-2026-4F8A-21D9 \{'\n'}
                {'  '}-H {'"'}x-api-key: {activeKeys[0]?.keyPrefix ?? 'ss_live_xxxx'}…{'"'}
              </code>
            </pre>
          </div>
        </section>
      </div>
    </>
  );
}
