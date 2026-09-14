# Artist website Home choices and visual work selection

## What will change

- Add three Home page arrangements artists can choose from:
  1. **Portrait**: the current profile-photo presentation.
  2. **Featured work**: one selected artwork as the main image.
  3. **Works grid**: a small opening selection of artworks with the artist's name and introduction.
- Show a clear visual preview for each Home choice and let the artist select the featured work or opening works using image thumbnails.
- Replace the text-only Works selector with two views:
  - **All works**: a visual thumbnail list with title, year, and selection checkbox.
  - **By series**: series names that open to reveal their artworks with thumbnails and checkboxes, plus an “Other works” group for unassigned works.
- Keep the existing rule that all works are shown unless the artist makes a specific selection.
- Make the public Home page follow the chosen arrangement while keeping the existing simple, restrained visual style.

## Technical details

- Add Home layout and Home artwork-selection fields to the artist website record, with safe defaults preserving every existing website's current appearance.
- Load artwork image records in one request for the website editor, resolve the web-ready image first, and fall back to the original image or legacy image URL.
- Include artwork series data in the editor query and group it locally, avoiding one request per artwork or series.
- Extend the public website lookup to return the new Home settings.
- Use the existing artwork visibility rules and storage paths. No billing, domain, or contact behavior will change.

## Verification

- Confirm old artist websites still open with the portrait arrangement by default.
- Confirm each Home arrangement renders correctly with and without available images.
- Confirm artworks can be selected from both All works and By series, and that both views stay synchronized.
- Check the editor and public artist website on desktop and mobile, then confirm the project builds cleanly.
