# Future Firebase deployment access

## Observed environment

Checked 2026-11-05: managed runtime status reports no outbound Google identity,
no runtime credential bindings and no secret bindings. The configured tools can
inspect identities but expose no action for provisioning or attaching one. There
is no Google Cloud CLI installed. Repository Git push is usable; GitHub API
workflow dispatch has returned Forbidden in this environment.

Consequently, a chat invitation or an email added as a Firebase project member
would not by itself give this agent usable credentials. There is no agent email
or Google principal to invite. Runtime Google identity support exists as a
consumer of a configured identity; availability of an account-linking UI is not
established by these tools.

## Recommended route: GitHub Actions with Workload Identity Federation

Give a dedicated deployment service account in project `bricks-8f56b` access via
GitHub's OIDC issuer `https://token.actions.githubusercontent.com`, instead of
creating a downloadable service-account JSON key or a long-lived Firebase token.
Once configured, the existing repository/CI workflow can publish reviewed rules
without copying them into the console manually. This integration is proposed,
not activated or verified.

Owner/admin bootstrap steps:

1. Create a workload identity pool/provider in the Bricks Google Cloud project.
   Restrict its attribute conditions to this repository's immutable repository
   and owner IDs and the `refs/heads/main` subject, rather than accepting all
   repositories in an organization or merely a reusable repository name.
2. Create a dedicated service account; allow only that restricted federated
   principal to impersonate it (Workload Identity User). Do not grant Project
   Owner or Editor.
3. Determine and test the smallest project permissions accepted by this pinned
   Firebase CLI for RTDB rule deployment. The installed CLI uses the RTDB
   `.settings/rules.json` endpoint, not Firestore rules publishing. A Firebase
   Rules Admin role alone must not be assumed sufficient. The CLI also queries
   Firebase project/database instance metadata. RTDB administration can imply
   access to data; do not promise an enforced rules-only boundary without testing.
4. Supply the provider resource name and service-account email as GitHub Actions
   variables, not key material. Add an explicit `id-token: write` job using
   `google-github-actions/auth` with federation and short-lived credentials.
5. Have the job run only after successful emulator/security tests for trusted
   main commits, with explicit target `--project bricks-8f56b --only database`.
   Deploy rules before activating clients that depend on those rules. Restrict
   write access to the workflow and main branch. Do not expose a deploy identity
   to pull-request code from forks.
6. Verify a first controlled deploy against the intended database and record the
   actual service account permissions/results before enabling routine deployment.

No paid backend or plan upgrade is required merely to adopt this authentication
pattern. APIs, organization policies and available federation settings must be
checked during bootstrap; no IAM access or billing changes have been made here.
Never send a password, service-account JSON key or login refresh token in chat.

References (not fetched live here; Google documentation hosts are currently
outside this environment's effective network access):
- https://github.com/google-github-actions/auth#workload-identity-federation
- https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- https://firebase.google.com/docs/cli#cli-ci-systems

## Direct runtime access, if the environment UI supports it

An alternative is an administrator-configured Google outbound identity attached
to this managed runtime. The agent should then inspect its readiness and use the
provided GCP selector manifest, without reading credential contents. No such
identity is currently attached. The agent cannot create this integration with
the available configuration tools. Network access to the exact RTDB hostname,
Firebase management APIs and token endpoints would also need to be configured;
Git access and a public Web App API key do not confer administrative access.
