import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, BadgeCheck, ExternalLink, Layers, ShieldAlert } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Alert } from '@/components/ui/Alert';
import { TableScroll } from '@/components/ui/TableScroll';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, Skeleton, StatCard } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { providerApi, type IssuedCertificateRow } from './provider-api';

function RevokeDialog({
  certificate,
  onClose,
}: {
  certificate: IssuedCertificateRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const revoke = useMutation({
    mutationFn: () => providerApi.revokeCertificate(certificate.certificateId, reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['provider'] });
      toast({
        tone: 'warning',
        title: 'Certificate revoked',
        description: certificate.certificateId + ' now verifies as revoked.',
      });
      onClose();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not revoke the certificate.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-title"
        className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-lifted animate-fade-up"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>

        <h2 id="revoke-title" className="mt-4 font-display text-lg font-bold">
          Revoke this certificate?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          <span className="font-medium text-ink-900">{certificate.holderName}</span> —{' '}
          {certificate.trackName}. Anyone verifying{' '}
          <span className="font-mono text-xs">{certificate.certificateId}</span> will see it as
          revoked immediately. This cannot be undone.
        </p>

        <div className="mt-4">
          <label htmlFor="revoke-reason" className="block text-sm font-medium text-ink-800">
            Reason <span className="text-danger-600">*</span>
          </label>
          <textarea
            id="revoke-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Shown to the holder and recorded in the audit log."
            className="mt-1.5 block w-full rounded-xl border-0 bg-surface px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-inset focus:ring-brand-500"
          />
        </div>

        {error && <Alert tone="error" className="mt-3">{error}</Alert>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 5}
            isLoading={revoke.isPending}
            loadingText="Revoking…"
            onClick={() => revoke.mutate()}
          >
            Revoke certificate
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TracksPage() {
  const [revoking, setRevoking] = useState<IssuedCertificateRow | null>(null);

  const tracks = useQuery({ queryKey: ['provider', 'tracks'], queryFn: providerApi.tracks });
  const certificates = useQuery({
    queryKey: ['provider', 'certificates'],
    queryFn: providerApi.certificates,
  });

  const issued = certificates.data ?? [];
  const active = issued.filter((c) => c.status !== 'REVOKED').length;

  return (
    <>
      <Seo
        title="Certification tracks"
        description="Your tracks and the certificates you have issued."
        path="/company/certifications"
        noIndex
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Certification tracks
          </h1>
          <p className="mt-2 text-ink-600">
            What each track requires, and every certificate issued against it.
          </p>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Tracks"
            value={tracks.data?.length ?? 0}
            icon={<Layers className="size-5" />}
          />
          <StatCard
            label="Certificates issued"
            value={issued.length}
            tone="accent"
            icon={<Award className="size-5" />}
          />
          <StatCard
            label="Currently valid"
            value={active}
            tone="valid"
            icon={<BadgeCheck className="size-5" />}
          />
        </section>

        {/* Tracks ---------------------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader title="Tracks" description="Requirements a learner must meet" />
          {tracks.isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : tracks.data?.length ? (
            <TableScroll label="Certification tracks">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Track</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Courses</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Skills</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Min score</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {tracks.data.map((track) => (
                    <tr key={track.id} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <span className="block font-medium text-ink-900">{track.name}</span>
                        {track.nsqfLevel !== null && (
                          <span className="block text-xs text-ink-500">
                            NSQF Level {track.nsqfLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-600">{track.courseCount}</td>
                      <td className="px-5 py-3 text-ink-600">{track.skillCount}</td>
                      <td className="px-5 py-3 text-ink-600">{track.minimumScore}%</td>
                      <td className="px-5 py-3 font-medium text-ink-900">
                        {track.certificatesIssued}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={<Layers className="size-6" />}
                title="No tracks yet"
                description="Tracks bundle courses, assessments and skills into a certification."
              />
            </div>
          )}
        </Card>

        {/* Issued certificates --------------------------------------------- */}
        <Card className="mt-6">
          <CardHeader title="Issued certificates" description="Revoke here if one was issued in error" />
          {certificates.isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : issued.length ? (
            <TableScroll label="Issued certificates">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Certificate</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Holder</th>
                    <th scope="col" className="hidden px-5 py-3 font-semibold text-ink-600 md:table-cell">
                      Track
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-ink-600">Status</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold text-ink-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {issued.map((certificate) => (
                    <tr key={certificate.id} className="transition hover:bg-ink-50">
                      <td className="px-5 py-3">
                        <Link
                          to={'/verify/' + certificate.certificateId}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-700 hover:underline"
                        >
                          {certificate.certificateId}
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </Link>
                        <span className="block text-xs text-ink-500">
                          {new Date(certificate.issuedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-ink-900">
                        {certificate.holderName}
                      </td>
                      <td className="hidden px-5 py-3 text-ink-600 md:table-cell">
                        {certificate.trackName}
                      </td>
                      <td className="px-5 py-3">
                        {certificate.status === 'REVOKED' ? (
                          <>
                            <Badge tone="danger">Revoked</Badge>
                            {certificate.revokedReason && (
                              <span className="mt-1 block max-w-48 truncate text-xs text-ink-500">
                                {certificate.revokedReason}
                              </span>
                            )}
                          </>
                        ) : (
                          <Badge tone="valid">Active</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {certificate.status !== 'REVOKED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                            onClick={() => setRevoking(certificate)}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={<Award className="size-6" />}
                title="No certificates issued yet"
                description="Certificates appear here once learners complete a track."
              />
            </div>
          )}
        </Card>
      </div>

      {revoking && <RevokeDialog certificate={revoking} onClose={() => setRevoking(null)} />}
    </>
  );
}
