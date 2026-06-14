# Display Normalization Contract

Status: ACTIVE

Boundary: raw source payload → stored source record → normalized display model → concise operator summary → explicit source details.

`src/ui/text.ts` is the canonical default-text normalization boundary. It strips script/style and HTML tags, decodes named/numeric entities, repairs common mojibake, normalizes whitespace, safely serializes primitive/object values, and clips summaries without mutating stored raw data.

Untrusted `dangerouslySetInnerHTML` is forbidden without a documented sanitizer and security review. Raw JSON/provider payloads may appear only in explicit source-detail or diagnostics surfaces.
