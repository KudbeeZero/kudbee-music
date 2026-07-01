'use client';

// The welcome gate — shown by the Hit Factory shell when no profile exists yet.
// Honest by design: "Continue as guest" is the real, working path (local-first
// account in this browser); Google/GitHub buttons render ONLY when a provider is
// actually configured at build time; and the founder's developer entry is a
// quiet link that appears only after visiting with ?dev=1.

import { useEffect, useState } from 'react';
import {
  authProviders,
  beginOAuth,
  isDevEntryAllowed,
  signInDev,
  signInGuest,
  type AuthProvider,
  type Profile,
} from '@/lib/hermes/identity';
import styles from './auth.module.css';

const PROVIDER_LABEL: Record<AuthProvider, string> = { google: 'Google', github: 'GitHub' };

export default function WelcomeGate({ onEnter }: { onEnter: (profile: Profile) => void }) {
  const [name, setName] = useState('');
  const [devDoor, setDevDoor] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const providers = authProviders();

  // client-only: the dev door reads the URL + localStorage (avoids SSR mismatch)
  useEffect(() => {
    setDevDoor(isDevEntryAllowed());
  }, []);

  function enterAsGuest() {
    onEnter(signInGuest(name));
  }

  function enterAsDev() {
    onEnter(signInDev());
  }

  function tryOAuth(provider: AuthProvider) {
    try {
      beginOAuth(provider);
    } catch (e) {
      setOauthError(e instanceof Error ? e.message : 'Sign-in is not available yet.');
    }
  }

  return (
    <div className={styles.gate}>
      <div className={styles.card}>
        <div className={styles.mark} aria-hidden="true">H</div>
        <div className={styles.kicker}>HERMES</div>
        <h2 className={styles.heading}>Welcome to the Hit Factory</h2>
        <p className={styles.pitch}>
          Describe a song idea and a brain of cross-checking agents turns it into a complete
          original package — hooks, lyrics, production notes, and a Suno prompt.
        </p>

        <label className={styles.nameLabel} htmlFor="wg-name">
          Artist name <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id="wg-name"
          className={styles.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') enterAsGuest();
          }}
          placeholder="What should we call you?"
          autoComplete="off"
        />

        <button className={styles.primaryBtn} onClick={enterAsGuest}>
          Continue as guest ▸
        </button>
        <p className={styles.honest}>Your work saves in this browser — export anytime from the Vault.</p>

        {providers.length > 0 ? (
          <div className={styles.providers}>
            {providers.map((p) => (
              <button key={p} className={styles.providerBtn} onClick={() => tryOAuth(p)}>
                Continue with {PROVIDER_LABEL[p]}
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.comingSoon}>
            Google &amp; GitHub sign-in are coming — accounts are local-first today.
          </p>
        )}

        {oauthError && (
          <p role="alert" className={styles.oauthError}>
            ⚠ {oauthError}
          </p>
        )}

        {devDoor && (
          <div className={styles.foot}>
            <button className={styles.devLink} onClick={enterAsDev}>
              Developer entry →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
