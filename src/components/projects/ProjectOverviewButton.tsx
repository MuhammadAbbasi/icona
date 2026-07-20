'use client';

import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatPKR } from '@/lib/utils';

export interface OverviewDomain {
  name: string;
  color: string | null;
  totals: number[]; // Index 0 = Baseline (R0), Index K = Rev K
}

interface RevisionInfo {
  index: number;
  label: string | null;
}

interface Props {
  projectName: string;
  domains: OverviewDomain[];
  coveredArea: number | null;
  rebate: number | null;
  sstRate: number | null;
  revisions: RevisionInfo[];
}

function perSft(amount: number, area: number | null): string {
  if (!area || area <= 0) return '-';
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount / area);
}

export function ProjectOverviewButton({ projectName, domains, coveredArea, rebate, sstRate, revisions = [] }: Props) {
  const [open, setOpen] = useState(false);

  // Number of columns = 1 (Baseline) + revisions.length
  const colCount = 1 + revisions.length;

  // Compute total cost for each column
  const totalCosts = Array.from({ length: colCount }, (_, colIdx) =>
    domains.reduce((sum, d) => sum + (d.totals[colIdx] ?? 0), 0)
  );

  const rebateAmt = rebate ?? 0;
  const sstRateVal = sstRate ?? 15;

  const afterRebates = totalCosts.map(tc => tc - rebateAmt);
  const ssts = afterRebates.map(ar => ar * (sstRateVal / 100));
  const withSsts = afterRebates.map((ar, idx) => ar + ssts[idx]);

  // Determine Dialog width based on revisions count
  const widthClass = revisions.length === 0
    ? 'max-w-2xl'
    : revisions.length === 1
    ? 'max-w-4xl'
    : 'max-w-6xl xl:max-w-7xl';

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 text-xs font-semibold h-9 border-border bg-card"
      >
        <BarChart3 className="h-4 w-4 text-primary" />
        Overview
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto ${widthClass}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Project Overview
            </DialogTitle>
            <DialogDescription>{projectName}: cost summary by domain</DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto rounded-lg border border-border mt-2">
            <table className="w-full text-sm">
              <thead>
                {revisions.length > 0 && (
                  <tr className="bg-muted/30 border-b border-border text-center text-xs font-semibold">
                    <th colSpan={2} />
                    <th colSpan={2} className="px-3 py-1.5 border-l border-border text-indigo-600 dark:text-indigo-400">Baseline (R0)</th>
                    {revisions.map((r) => (
                      <th key={r.index} colSpan={2} className="px-3 py-1.5 border-l border-border text-primary">
                        {r.label || `Revision ${r.index}`}
                      </th>
                    ))}
                  </tr>
                )}
                <tr className="bg-muted/50 text-muted-foreground text-xs text-left">
                  <th className="px-3 py-2 font-medium w-10">S.No</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  
                  {/* Baseline Header Columns */}
                  <th className="px-3 py-2 font-medium text-right border-l border-border w-36">Total Amount</th>
                  <th className="px-3 py-2 font-medium text-right w-24">Cost / Sft</th>

                  {/* Revision Header Columns */}
                  {revisions.map((r) => (
                    <React.Fragment key={r.index}>
                      <th className="px-3 py-2 font-medium text-right border-l border-border w-36">Total Amount</th>
                      <th className="px-3 py-2 font-medium text-right w-24">Cost / Sft</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {domains.map((d, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color ?? '#6366f1' }} />
                        {d.name}
                      </span>
                    </td>
                    
                    {/* Baseline amounts */}
                    <td className="px-3 py-2 text-right tabular-nums font-medium border-l border-border">
                      {formatPKR(d.totals[0] ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {perSft(d.totals[0] ?? 0, coveredArea)}
                    </td>

                    {/* Revisions amounts */}
                    {revisions.map((r, revIdx) => {
                      const val = d.totals[revIdx + 1] ?? 0;
                      return (
                        <React.Fragment key={r.index}>
                          <td className="px-3 py-2 text-right tabular-nums font-medium border-l border-border">
                            {formatPKR(val)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {perSft(val, coveredArea)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                <FootRow label="Total Cost" values={totalCosts} coveredArea={coveredArea} bold />
                <FootRow label="Rebate" values={Array(colCount).fill(rebateAmt ? `- ${formatPKR(rebateAmt)}` : '-')} coveredArea={coveredArea} showSft={false} />
                <FootRow label="Total Cost after Rebate" values={afterRebates} coveredArea={coveredArea} />
                <FootRow label={`${sstRateVal}% SST`} values={ssts} coveredArea={coveredArea} />
                <FootRow label="Total Cost of All Works with SST" values={withSsts} coveredArea={coveredArea} bold />
                <FootRow label="Covered Area (sq ft)" values={Array(colCount).fill(coveredArea ? new Intl.NumberFormat('en-PK').format(coveredArea) : 'Not set')} coveredArea={coveredArea} showSft={false} />
                <FootRow label="Per Sq Ft Cost" values={withSsts.map(w => perSft(w, coveredArea))} coveredArea={coveredArea} bold highlight showSft={false} />
              </tfoot>
            </table>
          </div>

          {!coveredArea && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Set the covered area in Project Settings to see per-sq-ft costs.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FootRow({ label, values, coveredArea, bold, highlight, showSft = true }: {
  label: string;
  values: (string | number)[];
  coveredArea: number | null;
  bold?: boolean;
  highlight?: boolean;
  showSft?: boolean;
}) {
  return (
    <tr className={highlight ? 'bg-primary/5' : 'bg-muted/20'}>
      <td className="px-3 py-2" />
      <td className={`px-3 py-2 ${bold ? 'font-semibold' : ''}`}>{label}</td>
      {values.map((v, idx) => {
        const displayValue = typeof v === 'number' ? formatPKR(v) : v;
        const numValue = typeof v === 'number' ? v : 0;
        const sft = perSft(numValue, coveredArea);

        return (
          <React.Fragment key={idx}>
            <td className={`px-3 py-2 text-right tabular-nums border-l border-border ${bold ? 'font-bold' : ''} ${highlight ? 'text-primary' : ''}`}>
              {displayValue}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
              {showSft && sft !== '-' ? sft : ''}
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );
}
