# IMChart

Recharts inside an `IMChartContainer`: `IMChartTooltip`, `IMChartLegend`. Series colours come from the config, never inline.

## Rules
- Series that are people use the artist ramp (`artist-N`, the same slot the artist has everywhere). Series that are categories use `chart-1…5`.
- Gridlines are `border` hairlines; axis labels are `caption` muted; values in tooltips are tabular.
- The tooltip is a small `card` with `shadow-overlay` and a swatch per series.

## Replaces
`Chart*`.
