# Real Runtime Proof Matrix

| Lane | Local fixture | Local adapter | Live provider | Deployed | Cleanup required |
|---|---:|---:|---:|---:|---:|
| Gmail classification | yes | yes | yes | yes | yes for live |
| Gmail ingestion | yes | yes | yes | yes | yes |
| Duplicate resistance | yes | yes | yes | yes | yes |
| Sheets read/write | yes | yes | yes | yes | yes |
| Sheets maintenance | yes | yes | yes | yes | yes |
| Auth boundary | yes | yes | yes | yes | no |
| Contact lifecycle | yes | yes | guarded | yes | yes when live |

Static validators must not claim any live-provider or deployed-runtime row in this matrix.
