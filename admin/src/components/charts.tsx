import { useState, type ReactNode } from 'react';

import { fmtDay, fmtNumber } from '../lib/format';

/** Smallest 1/2/5 × 10^k at or above n, so gridlines land on round numbers. */
function niceCeil(n: number) {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= n) ?? 10;
  return step * pow;
}

/**
 * Single-series column chart for a daily count. No legend: the card title names the
 * series. Hover or focus a day for its value; the table view carries the same numbers.
 */
export function DailyBars({ data, unit }: { data: { day: string; value: number }[]; unit: [string, string] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceCeil(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const noun = (n: number) => (n === 1 ? unit[0] : unit[1]);
  const a = active == null ? null : data[active];

  return (
    <div className="colchart">
      <div className="colchart-y" aria-hidden>
        {ticks.map((t) => (
          <span key={t}>{fmtNumber(t)}</span>
        ))}
      </div>
      <div className="colchart-plot" onMouseLeave={() => setActive(null)}>
        <div className="colchart-grid" aria-hidden>
          {ticks.map((t) => (
            <span key={t} />
          ))}
        </div>
        <div className="colchart-bars" role="list" aria-label={`${unit[1]} per day`}>
          {data.map((d, i) => (
            <div
              key={d.day}
              role="listitem"
              tabIndex={0}
              className={`colchart-col ${active === i ? 'is-active' : ''}`}
              aria-label={`${fmtDay(d.day)}: ${d.value} ${noun(d.value)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span className="colchart-bar" style={{ height: d.value ? `max(3px, ${(d.value / max) * 100}%)` : 0 }} />
            </div>
          ))}
        </div>
        {a && active != null && (
          <div
            className="tooltip"
            style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
            role="presentation"
          >
            <strong>{fmtNumber(a.value)}</strong> {noun(a.value)}
            <span className="muted"> · {fmtDay(a.day)}</span>
          </div>
        )}
        <div className="colchart-x" aria-hidden>
          {data.map((d, i) => (
            <span key={d.day}>{i % labelEvery === 0 || i === data.length - 1 ? fmtDay(d.day) : ''}</span>
          ))}
        </div>
      </div>
      <TableView>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th className="num">{unit[1][0].toUpperCase() + unit[1].slice(1)}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{fmtDay(d.day)}</td>
                <td className="num">{fmtNumber(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableView>
    </div>
  );
}

export interface HBarRow {
  key: string;
  label: ReactNode;
  sub?: ReactNode;
  value: number;
  /** Text shown at the end of the bar; defaults to the value. */
  display?: ReactNode;
  onClick?: () => void;
}

/** Horizontal bars with every value labelled directly, so no legend or tooltip is needed. */
export function HBars({ rows, max }: { rows: HBarRow[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="hbars">
      {rows.map((r) => {
        const content = (
          <>
            <span className="hbar-label">
              {r.label}
              {r.sub && <span className="hbar-sub">{r.sub}</span>}
            </span>
            <span className="hbar-track" aria-hidden>
              <span className="hbar-fill" style={{ width: r.value ? `max(4px, ${(r.value / top) * 100}%)` : 0 }} />
            </span>
            <span className="hbar-value">{r.display ?? fmtNumber(r.value)}</span>
          </>
        );
        return (
          <li key={r.key}>
            {r.onClick ? (
              <button className="hbar-row is-link" onClick={r.onClick}>
                {content}
              </button>
            ) : (
              <div className="hbar-row">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TableView({ children }: { children: ReactNode }) {
  return (
    <details className="tableview">
      <summary>View as table</summary>
      <div className="table-wrap">{children}</div>
    </details>
  );
}
