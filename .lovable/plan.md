# Correct portfolio material and value display

## Changes
- Show medium and support on one line, joined with “on” (for example, “Oil on Canvas”).
- Remove the separate repeated support line from both the portfolio owner view and shared link.
- Keep the portfolio value sourced from the collector’s Reserve price, falling back to Current market value when Reserve price is blank.
- Verify Frederik’s shared link displays the saved NOK value and the revised material wording.

## Technical details
- Update the two portfolio presentation pages only.
- Confirm the existing protected shared-data lookup returns the saved value before visual testing.
