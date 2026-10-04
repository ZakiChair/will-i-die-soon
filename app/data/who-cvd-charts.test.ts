import { describe, expect, test } from "vitest";

import { WHO_CVD_REGIONS } from "./countries";
import { WHO_LAB_CHARTS, WHO_NONLAB_CHARTS } from "./who-cvd-charts";

/** Cells indexed age band × 25 + pressure band × 5 + cholesterol or BMI band. */
function cells(chart: string): number[] {
  return Array.from({ length: chart.length / 2 }, (_, index) => Number(chart.slice(index * 2, index * 2 + 2)));
}

describe("WHO 2019 printed chart data", () => {
  test("never prints a lower risk for an older age, a higher pressure, cholesterol or BMI, smoking or diabetes", () => {
    const violations: string[] = [];
    const atLeast = (label: string, lower: ReadonlyArray<number>, higher: ReadonlyArray<number>) => {
      lower.forEach((value, index) => {
        if (higher[index] < value) violations.push(`${label} at cell ${index}`);
      });
    };
    for (const region of WHO_CVD_REGIONS) {
      const laboratory = WHO_LAB_CHARTS[region].map(cells);
      const nonLaboratory = WHO_NONLAB_CHARTS[region].map(cells);
      const charts = [
        ...laboratory.map((chart, index) => [`${region} laboratory ${index}`, chart] as const),
        ...nonLaboratory.map((chart, index) => [`${region} non-laboratory ${index}`, chart] as const),
      ];
      for (const [label, chart] of charts) {
        chart.forEach((value, index) => {
          if (index % 5 > 0 && value < chart[index - 1]) violations.push(`${label} cholesterol or BMI at cell ${index}`);
          if (Math.floor(index / 5) % 5 > 0 && value < chart[index - 5]) violations.push(`${label} pressure at cell ${index}`);
          if (index >= 25 && value < chart[index - 25]) violations.push(`${label} age at cell ${index}`);
        });
      }
      // Laboratory charts are ordered sex × diabetes × smoking, non-laboratory charts sex × smoking.
      for (const sex of [0, 1]) {
        for (const diabetes of [0, 1]) {
          atLeast(`${region} laboratory smoking`, laboratory[sex * 4 + diabetes * 2], laboratory[sex * 4 + diabetes * 2 + 1]);
        }
        for (const smoking of [0, 1]) {
          atLeast(`${region} laboratory diabetes`, laboratory[sex * 4 + smoking], laboratory[sex * 4 + 2 + smoking]);
        }
        atLeast(`${region} non-laboratory smoking`, nonLaboratory[sex * 2], nonLaboratory[sex * 2 + 1]);
      }
    }
    expect(violations).toEqual([]);
  });

  test("contains every regional cell once, in a fixed two-digit encoding", () => {
    expect(Object.keys(WHO_LAB_CHARTS).sort()).toEqual([...WHO_CVD_REGIONS].sort());
    expect(Object.keys(WHO_NONLAB_CHARTS).sort()).toEqual([...WHO_CVD_REGIONS].sort());
    let laboratoryCells = 0;
    let nonLaboratoryCells = 0;
    for (const region of WHO_CVD_REGIONS) {
      expect(WHO_LAB_CHARTS[region]).toHaveLength(8);
      expect(WHO_NONLAB_CHARTS[region]).toHaveLength(4);
      for (const value of WHO_LAB_CHARTS[region]) {
        expect(value).toMatch(/^\d{350}$/);
        laboratoryCells += value.length / 2;
      }
      for (const value of WHO_NONLAB_CHARTS[region]) {
        expect(value).toMatch(/^\d{350}$/);
        nonLaboratoryCells += value.length / 2;
      }
    }
    expect(laboratoryCells).toBe(29_400);
    expect(nonLaboratoryCells).toBe(14_700);
  });
});
