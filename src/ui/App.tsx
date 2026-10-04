import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig, ScreenConfig } from "../schemas/app-config";
import cody1Logo from "./assets/cody1-logo.png";

function Brand() {
  return (
    <div className="brand">
      <img
        src={cody1Logo}
        alt=""
        className="brand-mark"
        width={28}
        height={28}
      />
      <span>Cody1StoreKit</span>
    </div>
  );
}

type Preset = {
  id: string;
  label: string;
  platform: string;
};
type BgPreset = { id: string; label: string };

function resolveKey(bundle: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = bundle;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
}

function setKey(
  bundle: Record<string, unknown>,
  key: string,
  value: string,
): Record<string, unknown> {
  const parts = key.split(".");
  const clone = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone;
}

export function App() {
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [appId, setAppId] = useState("example");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [localeBundle, setLocaleBundle] = useState<Record<string, unknown>>(
    {},
  );
  const [presets, setPresets] = useState<Preset[]>([]);
  const [backgrounds, setBackgrounds] = useState<BgPreset[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [screenId, setScreenId] = useState<string>("01-hero");
  const [presetId, setPresetId] = useState("iphone69");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewError, setPreviewError] = useState("");
  const [status, setStatus] = useState("");
  const previewRequestId = useRef(0);
  const [showNewApp, setShowNewApp] = useState(false);
  const [dragging, setDragging] = useState(false);

  const screen = useMemo(
    () => config?.screens.find((s) => s.id === screenId),
    [config, screenId],
  );

  const visiblePresets = useMemo(() => {
    if (!config) return presets;
    const targets = config.targets ?? ["ios"];
    return presets.filter((p) => {
      if (targets.includes("ios") && (p.platform === "iphone" || p.platform === "ipad")) {
        return true;
      }
      if (targets.includes("mac") && p.platform === "mac") {
        return true;
      }
      return false;
    });
  }, [config, presets]);

  const loadApps = useCallback(async () => {
    const res = await fetch("/api/apps");
    const data = await res.json();
    setApps(data);
  }, []);

  const loadApp = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      setStatus("");
      setPreviewError("");
      const res = await fetch(`/api/apps/${id}`, { signal });
      const data = await res.json();
      if (signal?.aborted) return;
      if (!res.ok || data.error) {
        setConfig(null);
        setStatus(data.error ?? `Failed to load app (${res.status})`);
        return;
      }
      if (!data.config?.screens?.length) {
        setConfig(null);
        setStatus(`App "${id}" has no screens in app.config.json.`);
        return;
      }
      setConfig(data.config);
      setLocaleBundle(data.locale ?? {});
      const targets = data.config.targets ?? ["ios"];
      const initial = targets.includes("ios")
        ? data.config.defaultPreset
        : data.config.defaultMacPreset ?? "mac2880";
      setPresetId(initial);
      setScreenId(data.config.screens[0]?.id ?? "01-hero");
      setStatus(data.localeWarning ?? "");

      const shotsRes = await fetch(`/api/apps/${id}/screenshots`, { signal });
      if (signal?.aborted) return;
      const shotsData = await shotsRes.json();
      if (shotsRes.ok && Array.isArray(shotsData)) {
        setScreenshots(shotsData);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setConfig(null);
      setStatus(
        e instanceof Error
          ? `Cannot reach Cody1StoreKit API: ${e.message}`
          : "Cannot reach Cody1StoreKit API",
      );
    }
  }, []);

  useEffect(() => {
    loadApps();
    fetch("/api/presets")
      .then((r) => r.json())
      .then(setPresets);
    fetch("/api/backgrounds")
      .then((r) => r.json())
      .then(setBackgrounds);
  }, [loadApps]);

  useEffect(() => {
    const ac = new AbortController();
    if (appId) loadApp(appId, ac.signal);
    return () => ac.abort();
  }, [appId, loadApp]);

  const refreshPreview = useCallback(async () => {
    if (!config || !screen) return;
    const requestId = ++previewRequestId.current;
    setPreviewError("");
    const body: Record<string, unknown> = {
      appId,
      screenId,
      presetId,
      configOverride: config,
    };
    if (Object.keys(localeBundle).length > 0) {
      body.localeOverride = localeBundle;
    }
    const res = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (requestId !== previewRequestId.current) return;
    if (!res.ok) {
      const err = await res.json();
      const message = err.error ?? "Preview failed";
      setPreviewError(message);
      setStatus(message);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setPreviewError("");
  }, [appId, config, localeBundle, presetId, screen, screenId]);

  useEffect(() => {
    const t = setTimeout(() => {
      refreshPreview();
    }, 250);
    return () => clearTimeout(t);
  }, [refreshPreview]);

  function updateScreen(patch: Partial<ScreenConfig>) {
    if (!config || !screen) return;
    const screens = config.screens.map((s) =>
      s.id === screenId ? { ...s, ...patch } : s,
    );
    setConfig({ ...config, screens });
  }

  function updateCopy(field: "headline" | "subhead", value: string) {
    if (!screen) return;
    const key = screen.copy[field];
    if (!key) return;
    setLocaleBundle((b) => setKey(b, key, value));
  }

  async function saveConfig() {
    if (!config) return;
    await fetch(`/api/apps/${appId}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (Object.keys(localeBundle).length > 0) {
      await fetch(`/api/apps/${appId}/locales/${config.defaultLocale}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localeBundle),
      });
    }
    setStatus("Configuration saved.");
  }

  async function runValidate() {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, presetId, dev: false }),
    });
    const data = await res.json();
    setStatus(data.text ?? data.error);
  }

  async function runGenerate(production: boolean) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, presetId, dev: !production }),
    });
    const data = await res.json();
    if (data.error) {
      setStatus(data.error);
      return;
    }
    setStatus(
      `Generated ${data.files.length} PNGs → ${data.outputDir}${production ? "" : " (demo placeholders allowed)"}`,
    );
  }

  function onPreviewPointerDown(e: React.PointerEvent) {
    if (!screen?.device) return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPreviewPointerMove(e: React.PointerEvent) {
    if (!dragging || !screen?.device) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    updateScreen({
      device: {
        ...screen.device,
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      },
    });
  }

  function onPreviewPointerUp() {
    setDragging(false);
  }

  if (!config || !screen) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <Brand />
        </header>
        <div style={{ padding: 24 }}>
          {status ? (
            <>
              <p style={{ color: "var(--danger)" }}>{status}</p>
              <button
                type="button"
                className="btn"
                onClick={() => loadApp(appId)}
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <p>Loading…</p>
              <p style={{ color: "var(--muted)", fontSize: 0.9, marginTop: 12 }}>
                If this takes more than a few seconds, quit any other Cody1StoreKit
                windows and reopen the app.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const headlineText = resolveKey(localeBundle, screen.copy.headline);
  const subheadText = screen.copy.subhead
    ? resolveKey(localeBundle, screen.copy.subhead)
    : "";

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            aria-label="App"
          >
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => setShowNewApp(true)}>
            Add App
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="panel screen-list">
          <div style={{ fontSize: 0.8, color: "var(--muted)", marginBottom: 8 }}>
            SCREEN SET
          </div>
          {config.screens.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={s.id === screenId ? "active" : ""}
              onClick={() => setScreenId(s.id)}
            >
              {String(i + 1).padStart(2, "0")} {s.id.replace(/^\d+-/, "")}
            </button>
          ))}
        </aside>

        <main className="panel preview-wrap">
          <div
            className="preview-frame"
            onPointerDown={onPreviewPointerDown}
            onPointerMove={onPreviewPointerMove}
            onPointerUp={onPreviewPointerUp}
            title="Drag to reposition device"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Live preview" draggable={false} />
            ) : previewError ? (
              <div
                style={{
                  padding: 48,
                  color: "var(--danger)",
                  maxWidth: 480,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {previewError}
              </div>
            ) : (
              <div style={{ padding: 80, color: "#666" }}>Preview…</div>
            )}
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={refreshPreview}>
              Preview
            </button>
            <button type="button" className="btn" onClick={runValidate}>
              Validate
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => runGenerate(true)}
            >
              Generate All
            </button>
            <button type="button" className="btn" onClick={() => runGenerate(false)}>
              Generate (dev)
            </button>
            <button type="button" className="btn" onClick={saveConfig}>
              Save config
            </button>
          </div>
          {status && <div className="status">{status}</div>}
        </main>

        <aside className="panel">
          <div className="field">
            <label>Headline</label>
            <textarea
              value={headlineText}
              onChange={(e) => updateCopy("headline", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Supporting copy</label>
            <textarea
              value={subheadText}
              onChange={(e) => updateCopy("subhead", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Screenshot</label>
            <div className="thumbs">
              {screenshots.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={screen.screenshot === f ? "selected" : ""}
                  onClick={() => updateScreen({ screenshot: f })}
                >
                  <img
                    src={`/api/apps/${appId}/screenshot/${f}`}
                    alt={f}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Template</label>
            <select
              value={screen.template ?? config.template}
              onChange={(e) => updateScreen({ template: e.target.value as AppConfig["template"] })}
            >
              <option value="utility-clean">Utility Clean</option>
              <option value="puzzle">Puzzle</option>
              <option value="arcade">Arcade</option>
            </select>
          </div>
          <div className="field">
            <label>Background</label>
            <select
              value={screen.background?.preset ?? "soft-blue"}
              onChange={(e) =>
                updateScreen({
                  background: { preset: e.target.value },
                })
              }
            >
              {backgrounds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Output preset</label>
            <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              {visiblePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {screen.device && (
            <>
              <div className="field">
                <label>Device</label>
                <select
                  value={screen.device.type}
                  onChange={(e) =>
                    updateScreen({
                      device: {
                        ...screen.device!,
                        type: e.target.value as "iphone" | "ipad",
                      },
                    })
                  }
                >
                  <option value="iphone">iPhone</option>
                  <option value="ipad">iPad</option>
                  <option value="mac">Mac</option>
                </select>
              </div>
              <div className="field slider-row">
                <label>Scale {screen.device.scale.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.4}
                  max={1.1}
                  step={0.01}
                  value={screen.device.scale}
                  onChange={(e) =>
                    updateScreen({
                      device: {
                        ...screen.device!,
                        scale: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="field slider-row">
                <label>X {screen.device.x.toFixed(2)}</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={screen.device.x}
                  onChange={(e) =>
                    updateScreen({
                      device: {
                        ...screen.device!,
                        x: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="field slider-row">
                <label>Y {screen.device.y.toFixed(2)}</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={screen.device.y}
                  onChange={(e) =>
                    updateScreen({
                      device: {
                        ...screen.device!,
                        y: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="field slider-row">
                <label>Rotation {screen.device.rotation}°</label>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={screen.device.rotation}
                  onChange={(e) =>
                    updateScreen({
                      device: {
                        ...screen.device!,
                        rotation: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </>
          )}
          <div className="actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (!confirm("Reset this screen to defaults?")) return;
                loadApp(appId);
              }}
            >
              Reset Screen
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (!confirm("Reload app from disk (discard unsaved edits)?"))
                  return;
                loadApp(appId);
              }}
            >
              Reset App
            </button>
          </div>
        </aside>
      </div>

      {showNewApp && (
        <NewAppModal
          onClose={() => setShowNewApp(false)}
          onCreated={(id) => {
            setShowNewApp(false);
            loadApps();
            setAppId(id);
          }}
        />
      )}
    </div>
  );
}

function NewAppModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("utility-clean");
  const [duplicateFrom, setDuplicateFrom] = useState("");
  const [targets, setTargets] = useState<"ios" | "mac" | "both">("ios");
  const [error, setError] = useState("");

  async function submit() {
    const res = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name,
        template,
        defaultLocale: "en-GB",
        duplicateFrom: duplicateFrom || undefined,
        targets:
          targets === "both"
            ? ["ios", "mac"]
            : targets === "mac"
              ? ["mac"]
              : ["ios"],
      }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    onCreated(data.id);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Add App</h3>
        <div className="field">
          <label>App ID</label>
          <input value={id} onChange={(e) => setId(e.target.value)} />
        </div>
        <div className="field">
          <label>Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Template</label>
          <select value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="utility-clean">Utility Clean</option>
            <option value="puzzle">Puzzle</option>
            <option value="arcade">Arcade</option>
          </select>
        </div>
        <div className="field">
          <label>App Store targets</label>
          <select
            value={targets}
            onChange={(e) =>
              setTargets(e.target.value as "ios" | "mac" | "both")
            }
          >
            <option value="ios">iOS only</option>
            <option value="mac">Mac only</option>
            <option value="both">iOS + Mac</option>
          </select>
        </div>
        <div className="field">
          <label>Duplicate from (optional)</label>
          <input
            placeholder="my-app"
            value={duplicateFrom}
            onChange={(e) => setDuplicateFrom(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
