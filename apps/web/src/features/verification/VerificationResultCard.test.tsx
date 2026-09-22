import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerificationResultCard } from './VerificationResultCard';
import type { VerificationResponse, VerifiedCertificate } from '@skillseal/shared';

const verifiedAt = '2026-01-15T10:00:00.000Z';

function makeCertificate(overrides: Partial<VerifiedCertificate> = {}): VerifiedCertificate {
  return {
    certificateId: 'SS-2026-4F8A-21D9',
    holderName: 'Asha Verma',
    trackName: 'Full-Stack Development',
    issuerName: 'Infosys Springboard',
    skills: ['React', 'Node.js'],
    score: 88,
    nsqfLevel: 5,
    issuedAt: '2025-06-01T00:00:00.000Z',
    expiresAt: null,
    revokedAt: null,
    revokedReason: null,
    onestStatus: 'PENDING',
    onestPublishedAt: null,
    signatureValid: true,
    ...overrides,
  };
}

function makeResponse(
  result: VerificationResponse['result'],
  overrides: Partial<VerifiedCertificate> = {},
): VerificationResponse {
  return {
    result,
    certificate: result === 'NOT_FOUND' ? null : makeCertificate(overrides),
    verifiedAt,
  };
}

describe('VerificationResultCard', () => {
  it('shows the valid banner with the animated checkmark and certificate details', () => {
    render(<VerificationResultCard response={makeResponse('VALID')} />);

    expect(screen.getByRole('heading', { name: /this certificate is valid/i })).toBeInTheDocument();
    expect(screen.getByText('Asha Verma')).toBeInTheDocument();
    expect(screen.getByText('Full-Stack Development')).toBeInTheDocument();
    expect(screen.getByText('Infosys Springboard')).toBeInTheDocument();
    expect(screen.getByText('SS-2026-4F8A-21D9')).toBeInTheDocument();
    expect(screen.getByText('NSQF Level 5')).toBeInTheDocument();
    expect(screen.getByText('Signature verified')).toBeInTheDocument();
    expect(screen.getByText('Assessment score 88%')).toBeInTheDocument();
  });

  it('renders an EXPIRED result with the expiry date called out', () => {
    render(
      <VerificationResultCard
        response={makeResponse('EXPIRED', { expiresAt: '2025-12-31T00:00:00.000Z' })}
      />,
    );
    expect(screen.getByRole('heading', { name: /this certificate has expired/i })).toBeInTheDocument();
    // The date renders in the viewer's locale; assert the label row instead.
    expect(screen.getByText('Valid until')).toBeInTheDocument();
  });

  it('marks REVOKED as unacceptable and shows the reason', () => {
    render(
      <VerificationResultCard
        response={makeResponse('REVOKED', {
          revokedAt: '2026-01-02T00:00:00.000Z',
          revokedReason: 'Issued in error',
        })}
      />,
    );
    expect(screen.getByRole('heading', { name: /this certificate has been revoked/i })).toBeInTheDocument();
    expect(screen.getByText('Issued in error')).toBeInTheDocument();
  });

  it('warns loudly when the signature does not match (TAMPERED)', () => {
    render(<VerificationResultCard response={makeResponse('TAMPERED', { signatureValid: false })} />);
    expect(
      screen.getByRole('heading', { name: /failed its integrity check/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Signature does not match/)).toBeInTheDocument();
  });

  it('explains a NOT_FOUND lookup and echoes the queried ID', () => {
    render(
      <VerificationResultCard response={makeResponse('NOT_FOUND')} queriedId="SS-2026-0000-0000" />,
    );
    expect(screen.getByRole('heading', { name: /no certificate with that id/i })).toBeInTheDocument();
    expect(screen.getByText('SS-2026-0000-0000')).toBeInTheDocument();
    expect(screen.queryByText('Asha Verma')).not.toBeInTheDocument();
  });

  it('lists validated skills when present and omits the section otherwise', () => {
    const { unmount } = render(
      <VerificationResultCard response={makeResponse('VALID')} />,
    );
    expect(screen.getByText('Skills validated')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();

    unmount();
    render(
      <VerificationResultCard response={makeResponse('VALID', { skills: [] })} />,
    );
    expect(screen.queryByText('Skills validated')).not.toBeInTheDocument();
  });

  it('labels the ONEST publication state when published', () => {
    render(
      <VerificationResultCard response={makeResponse('VALID', { onestStatus: 'PUBLISHED' })} />,
    );
    expect(screen.getByText('Published to ONEST')).toBeInTheDocument();
  });
});
