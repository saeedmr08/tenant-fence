"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  tenantLabel,
  type TenantId,
  type TenantRecord,
} from "@/lib/tenant";
import styles from "./lab.module.css";

type ViewOrg = TenantId;

export function IsolationLab() {
  const [viewAs, setViewAs] = useState<ViewOrg>("org_acme_north");
  const [records, setRecords] = useState<TenantRecord[]>([]);
  const [attackTargets, setAttackTargets] = useState<string[]>([]);
  const [attemptLog, setAttemptLog] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  const load = useCallback(async (tenantId: TenantId) => {
    const res = await fetch(
      `/api/records?tenantId=${encodeURIComponent(tenantId)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      records: TenantRecord[];
      attackTargets: string[];
    };
    setRecords(data.records);
    setAttackTargets(data.attackTargets);
  }, []);

  useEffect(() => {
    void load(viewAs);
  }, [viewAs, load]);

  function switchOrg(id: ViewOrg) {
    setViewAs(id);
  }

  async function tryCrossRead(foreignId: string) {
    const res = await fetch(
      `/api/records/${encodeURIComponent(foreignId)}?tenantId=${encodeURIComponent(viewAs)}`,
    );
    const data = (await res.json()) as {
      status?: string;
      record?: TenantRecord;
    };
    const line =
      res.status === 404 || data.status === "not_found"
        ? `Attack: ${tenantLabel(viewAs)} requested ${foreignId} → not_found (fence held)`
        : `Attack: LEAKED ${data.record?.title ?? foreignId}`;
    setAttemptLog((prev) => [line, ...prev].slice(0, 12));
  }

  function runProbe() {
    startTransition(() => {
      void (async () => {
        const lines: string[] = [];
        for (const id of attackTargets) {
          const res = await fetch(
            `/api/records/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(viewAs)}`,
          );
          const data = (await res.json()) as { status?: string };
          lines.push(
            res.status === 404 || data.status === "not_found"
              ? `${tenantLabel(viewAs)} → ${id}: BLOCKED → not_found`
              : `${tenantLabel(viewAs)} → ${id}: LEAK`,
          );
        }
        setAttemptLog(lines);
      })();
    });
  }

  async function create() {
    if (!title.trim()) return;
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: viewAs,
        title: title.trim(),
        classification: "internal",
      }),
    });
    if (!res.ok) return;
    setTitle("");
    await load(viewAs);
  }

  return (
    <section id="lab" className={styles.lab}>
      <div className={styles.toolbar}>
        <div className={styles.orgSwitch} role="group" aria-label="View as tenant">
          <button
            type="button"
            className={
              viewAs === "org_acme_north" ? styles.orgActive : styles.orgBtn
            }
            onClick={() => switchOrg("org_acme_north")}
          >
            Acme North
          </button>
          <button
            type="button"
            className={
              viewAs === "org_globex_south" ? styles.orgActive : styles.orgBtn
            }
            onClick={() => switchOrg("org_globex_south")}
          >
            Globex South
          </button>
        </div>
        <button
          type="button"
          className={styles.probeBtn}
          onClick={runProbe}
          disabled={pending}
        >
          {pending ? "Probing…" : "Run cross-tenant attack"}
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Records visible to {tenantLabel(viewAs)}
          </h2>
          {records.length === 0 ? (
            <p className={styles.empty}>
              No records visible to {tenantLabel(viewAs)}. Create one under this tenant — the other org will not see it.
            </p>
          ) : null}
          <ul className={styles.recordList}>
            {records.map((r) => (
              <li key={r.id} className={styles.record}>
                <div>
                  <p className={styles.recordTitle}>{r.title}</p>
                  <p className={styles.recordMeta}>
                    <span className={styles.mono}>{r.id}</span>
                    <span className={styles.badge}>{r.classification}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
            <input
              value={title}
              placeholder="New record title"
              onChange={(e) => setTitle(e.target.value)}
            />
            <button type="button" className={styles.probeBtn} onClick={() => void create()}>
              Create under {tenantLabel(viewAs)}
            </button>
          </div>

          <h3 className={styles.panelTitle} style={{ marginTop: "1.5rem" }}>
            Foreign ids (attack as {tenantLabel(viewAs)})
          </h3>
          <ul className={styles.recordList}>
            {attackTargets.map((id) => (
              <li key={id} className={styles.record}>
                <div>
                  <p className={styles.recordMeta}>
                    <span className={styles.mono}>{id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.attackBtn}
                  onClick={() => void tryCrossRead(id)}
                >
                  Request as {tenantLabel(viewAs)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Attack attempt log</h2>
          {attemptLog.length === 0 ? (
            <p className={styles.empty}>
              Pick tenant A or B, then request the other org&apos;s id. Cross-tenant
              gets must return <code>not_found</code> (HTTP 404).
            </p>
          ) : (
            <ul className={styles.log}>
              {attemptLog.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`} className={styles.logLine}>
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
