import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthMeter } from './PasswordStrength';

/**
 * The meter mirrors @skillseal/shared's assessPassword, so the fixtures here
 * pin down both the strength buckets and the rule checklist behaviour.
 */
describe('PasswordStrengthMeter', () => {
  it('renders nothing until the user types', () => {
    const { container } = render(<PasswordStrengthMeter value="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels a short password as weak', () => {
    render(<PasswordStrengthMeter value="abc" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
    expect(screen.getByText('Password strength: Weak')).toBeInTheDocument();
  });

  it('labels a password meeting every rule as strong', () => {
    const { container } = render(<PasswordStrengthMeter value="Abcdefg1!j" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-valid-500')).toHaveLength(4);
  });

  it('rewards a long passphrase even without a symbol', () => {
    // 19 lowercase characters: 2 rules + the length bonus = "fair".
    render(<PasswordStrengthMeter value="correcthorsebattery" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('lists every shared rule so the user can see what is missing', () => {
    render(<PasswordStrengthMeter value="Abcdefg1ij" />);
    expect(screen.getByText('At least 10 characters')).toBeInTheDocument();
    expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('One number')).toBeInTheDocument();
    expect(screen.getByText('One symbol')).toBeInTheDocument();
  });

  it('hides the checklist in compact mode but keeps the bar', () => {
    render(<PasswordStrengthMeter value="Abcdefg1!j" compact />);
    expect(screen.queryByText('One symbol')).not.toBeInTheDocument();
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});
