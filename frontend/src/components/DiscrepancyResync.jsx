import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Truck, X } from "lucide-react";

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "");

function Stat({ label, value, testid, cls }) {
  return (
    <div className="border border-slate-200 rounded-sm p-3 bg-slate-50/60" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
      <div className={`font-mono-num text-xl font-extrabold ${cls}`}>{value}</div>
    </div>
  );
}

function Row({ c, t }) {
  const clear = c.action === "clear";
  return (
    <div className="py-3 border-b border-slate-100 last:border-0" data-testid={`disc-resync-row-${c.order_id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-sm text-slate-900">{c.customer_name}</span>
        <span className="text-xs text-slate-500 font-mono-num">#{c.order_id.slice(0, 8)} · {fmt(c.order_date)}</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700">
          <Truck className="w-3 h-3" /> {t("orders.slip", "Slip")} #{c.slip_no} · {fmt(c.dispatched_at)}
        </span>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm border ${clear ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
          {clear
            ? (c.new_status === "Dispatched" ? t("discResync.clearFull") : t("discResync.clearPart", { from: c.pending_before, to: c.pending_after }))
            : t("discResync.keep")}
        </span>
      </div>
      {clear && c.slip_lines.map((s) => (
        <div key={s.slip_no} className="mt-1 flex flex-wrap gap-1">
          {s.items.map((it, i) => (
            <span key={i} className="text-[11px] px-1.5 py-0.5 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-900">
              {it.item_name}: <b className="font-mono-num">{it.quantity}</b>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DiscrepancyResync({ onApplied }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const run = async (dryRun) => {
    if (!dryRun && !window.confirm(t("discResync.confirm", { n: res?.count || 0 }))) return;
    setBusy(true);
    try {
      const { data } = await api.post("/orders/discrepancy-resync", null, { params: { dry_run: dryRun } });
      setRes(data);
      if (!dryRun) {
        toast.success(t("discResync.applied", { n: data.count }));
        onApplied?.();
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("common.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-amber-200 rounded-sm" data-testid="disc-resync-card">
      <div className="p-5 border-b border-amber-100 flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-sm bg-amber-50 border border-amber-200 grid place-items-center text-amber-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="font-bold text-slate-900">{t("discResync.title")}</div>
          <div className="text-xs text-slate-500">{t("discResync.desc")}</div>
        </div>
        <Button onClick={() => run(true)} disabled={busy} data-testid="disc-resync-check-btn"
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-sm h-10 px-4 font-bold">
          {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          {t("discResync.checkBtn")}
        </Button>
      </div>
      {res && (
        <div className="p-5 space-y-3" data-testid="disc-resync-result">
          <div className="grid grid-cols-3 gap-2">
            <Stat label={t("discResync.statTotal")} value={res.count} cls="text-slate-900" testid="disc-resync-stat-total" />
            <Stat label={t("discResync.statClear")} value={res.to_clear} cls="text-emerald-700" testid="disc-resync-stat-clear" />
            <Stat label={t("discResync.statKeep")} value={res.to_keep} cls="text-slate-600" testid="disc-resync-stat-keep" />
          </div>
          {res.count === 0 ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700" data-testid="disc-resync-all-good">
              <CheckCircle2 className="w-4 h-4" /> {t("discResync.allGood")}
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-sm px-3" data-testid="disc-resync-list">
                {res.changes.map((c) => <Row key={c.order_id} c={c} t={t} />)}
              </div>
              {res.dry_run && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] text-slate-500">{t("discResync.undoHint")}</span>
                  <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setRes(null)} disabled={busy} data-testid="disc-resync-cancel-btn"
                          className="rounded-sm h-10 px-4 font-bold">
                    <X className="w-4 h-4 mr-1.5" /> {t("common.cancel", "Cancel")}
                  </Button>
                  <Button onClick={() => run(false)} disabled={busy} data-testid="disc-resync-apply-btn"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm h-10 px-4 font-bold">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> {t("discResync.applyBtn", { n: res.count })}
                  </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
