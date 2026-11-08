# Phase 3 integration and security review

Reviewed 2026-11-08 against repository state `459cda9`. This is an engineering
review and automated emulator verification, not a penetration test or an
independent production Firebase configuration audit.

## Findings and remaining decisions

1. **Client-authoritative results.** Players simulate locally and submit scores,
   boards and Battle timing. Rules constrain ownership, schema, monotonicity and
   timing, but cannot prove that the submitted moves or score are legitimate.
   Local rankings are not suitable as trusted public competitive rankings without
   an authoritative verifier/backend and a product decision about its cost.
2. **Anonymous account and reservation abuse.** Authenticated anonymous users can
   read a known room code and reserve unused codes. There is no robust per-person
   creation limit; four-character room codes are guessable and reservations are
   permanent. An attacker can consume quota or join a discoverable open room.
   App Check and monitoring can reduce automated abuse but do not provide a
   guarantee. Changing code length or reservation expiry requires a product
   decision because existing links and the approved four-character choice matter.
3. **Storage growth and service quotas.** Match records are bounded per room
   epoch but old epochs are not automatically pruned. Clients cannot guarantee
   cleanup when everyone leaves. Monitor actual storage, connections and
   downloads in Firebase; estimates in `FIREBASE_QUOTA.md` are not measured
   production costs. Any automated cleanup must preserve owned room codes and be
   separately designed and tested.
4. **Recovery is best effort.** The last acknowledged checkpoint can be older
   than recent inputs. Inconsistent or unavailable checkpoints, a missed deadline,
   or excessive active Battle frame skew cause abandonment without a competitive
   result. If both clients are offline, timeout processing waits for a participant
   to reconnect. Live Firebase behavior has not been independently exercised from
   this environment.

## Observed verification

- `npm run lint`, `npm run build` and `npm test`: passed, 148 unit tests.
- `npm run test:browser`: passed, 15 production-build browser tests.
- `npm run test:firebase` with local proxy variables unset: passed, 42 tests,
  including two-browser host/guest recovery, repeated interruptions and reload,
  Battle attacks, completed-player recovery, abandonment and rules authorization.
- The owner reported the Firebase rules installed; Pages deployment for `09a7cb6`
  passed CI. Direct production-site access from this environment returned proxy
  403, so production gameplay, current Firebase settings and quota use remain
  unverified here.

No live Firebase rules or product behavior were changed by this review.
