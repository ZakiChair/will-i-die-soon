import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "app/results-design.css"), "utf8");
const print = [...css.matchAll(/^@media print \{\n(?<rules>[\s\S]*?)\n\}/gm)]
  .map((match) => match.groups?.rules ?? "")
  .join("\n");

test("prints each pathology card as blocks that break between their parts", () => {
  expect(print).toMatch(/^\s*\.results \.pathology-score \{ display: block; \}$/m);
  expect(print).not.toMatch(/\.results \.pathology-score \{[^}]*break-inside/);
  expect(print).toMatch(/\.results \.pathology-score__identity \{[^}]*break-after: avoid;/);
  expect(print).toContain(
    ".results :is(.pathology-score__identity, .pathology-score__reading > *, .pathology-score__evidence > *) { break-inside: avoid; }",
  );
});
