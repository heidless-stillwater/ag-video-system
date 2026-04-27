'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { AgeVerificationModal } from './AgeVerificationModal';
import { useSovereignStatus } from '@/hooks/useSovereignStatus';
import { SovereignLock } from './SovereignLock';
import { SovereignAlert } from './SovereignAlert';

/**
 * The Sovereign Sentinel is a root-level compliance enforcer.
 * It monitors the global protection status and anchors the physical
 * Age Verification gate OR the Sovereign Lock when compliance is breached.
 */
export function SovereignSentinel() {
  const { user } = useAuth();
  const { gated, status, message, breachedPolicySlug } = useSovereignStatus();
  
  // Local state for AV verification (could be moved to AuthContext if needed)
  const [avVerified, setAvVerified] = React.useState(false);

  // Check for AV cookie on mount
  React.useEffect(() => {
    const isVerified = document.cookie.split('; ').find(row => row.startsWith('stillwater_av_verified='));
    if (isVerified) setAvVerified(true);
  }, []);

  // 1. Sovereign Gating (Suite-wide lock) takes precedence
  if (gated && status === 'red') {
    return <SovereignLock message={message} breachedPolicySlug={breachedPolicySlug} />;
  }

  // 2. Determine if AV is required (Simplified for now: required if not verified)
  // In a real suite, this would check protection.avEnabled
  const avRequired = !avVerified;

  return (
    <>
      {/* 2. Advisory Alerts (Non-blocking) */}
      {status === 'amber' && message && (
        <SovereignAlert message={message} policySlug={breachedPolicySlug} />
      )}

      {/* 3. Age Verification (App-specific compliance) */}
      {avRequired && (
        <AgeVerificationModal 
          onVerified={() => {
            console.log('[SovereignSentinel] Compliance Verified. Anchoring session...');
            setAvVerified(true);
          }} 
        />
      )}
    </>
  );
}
