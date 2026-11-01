# IMStatusLabel

A state in words: a small dot in the role's colour and the label in ordinary text — the quiet alternative to a badge in lists.

## Props
- `role` — `new · wait · done · dead · warning · danger`.
- `children` — the label (one to three words).

## Rules
The colour lives in the dot only, so a column of them reads as text. Use it in list rows and cards; use `IMBadge` where the state is the headline.
