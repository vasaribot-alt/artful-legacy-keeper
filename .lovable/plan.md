# Make estate handover safely retryable

## What will change
- Treat a handover as **pending** when the named heir has no account matching the exact email address.
- Show “Estate custodianship process activated” with a clear note that access is waiting for the heir to register.
- Keep the handover action visible for pending entries, relabelled so foundation staff can retry it after registration.
- Mark the estate as fully activated only after access has actually been granted to the heir.
- Show a distinct “Waiting for account” status to both foundation staff and the artist.

## Technical details
- Update the estate activation database function so a missing account records `pending_account` without changing the artist’s public estate status.
- On a later retry, create the approved archive access and change the entry to `activated`.
- Update the foundation and artist views to distinguish `named`, `pending_account`, `activated`, and `revoked`.
- Verify the current build and the retry behavior represented in the interface.
