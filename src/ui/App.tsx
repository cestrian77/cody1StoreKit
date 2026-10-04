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
type TemplateOption = {
  id: string;
  label: string;
  category: string;
  description: string;
};

const TEMPLATE_GROUP_ORDER = ["utility", "puzzle", "arcade"] as const;
const TEMPLATE_GROUP_LABELS: Record<string, string> = {
  utility: "Utility",
  puzzle: "Puzzle",
  arcade: "Arcade",
};

function TemplateSelect({
  value,
  onChange,
  templates,
}: {
  value: string;
  onChange: (id: string) => void;
  templates: TemplateOption[];
}) {
  const grouped = useMemo(() => {
    return TEMPLATE_GROUP_ORDER.map((cat) => ({
      cat,
      label: TEMPLATE_GROUP_LABELS[cat] ?? cat,
      items: templates.filter((t) => t.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [templates]);

  if (templates.length === 0) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="utility-clean">Utility Clean</option>
      </select>
    );
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {grouped.map((g) => (
        <optgroup key={g.cat} label={g.label}>
          {g.items.map((t) => (
            <option key={t.id} value={t.id} title={t.description}>
              {t.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

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
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [screenId, setScreenId] = useState<string>("01-hero");
  const [presetId, setPresetId] = useState("iphone69");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewError, setPreviewError] = useState("");
  const [status, setStatus] = useState("");
  const previewRequestId = useRef(0);
  const [showNewApp, setShowNewApp] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [shotDragging, setShotDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSnapshotRef = useRef("");

  const isDirty = useMemo(() => {
    if (!config) return false;
    const snap = JSON.stringify({ config, localeBundle });
    return snap !== savedSnapshotRef.current;
  }, [config, localeBundle]);

  const screen = useMemo(
    () => config?.screens.find((s) => s.id === screenId),
    [config, screenId],
  );

  const visiblePresets = useMemo(() => {
    if (!config) return presets;
    const deviceType = screen?.device?.type;
    if (deviceType) {
      return presets.filter((p) => p.platform === deviceType);
    }
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
  }, [config, presets, screen?.device?.type]);

  useEffect(() => {
    if (visiblePresets.length === 0) return;
    if (visiblePresets.some((p) => p.id === presetId)) return;
    const deviceType = screen?.device?.type;
    const preferred =
      deviceType === "mac"
        ? (config?.defaultMacPreset ?? "mac2880")
        : deviceType === "ipad"
          ? "ipad13"
          : (config?.defaultPreset ?? "iphone69");
    const match = visiblePresets.find((p) => p.id === preferred);
    setPresetId(match?.id ?? visiblePresets[0].id);
  }, [visiblePresets, presetId, screen?.device?.type, config]);

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
      savedSnapshotRef.current = JSON.stringify({
        config: data.config,
        localeBundle: data.locale ?? {},
      });
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
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates);
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

  async function saveProject() {
    if (!config) return;
    const configRes = await fetch(`/api/apps/${appId}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!configRes.ok) {
      const err = await configRes.json();
      setStatus(err.error ?? "Failed to save project");
      return;
    }
    if (Object.keys(localeBundle).length > 0) {
      const locRes = await fetch(
        `/api/apps/${appId}/locales/${config.defaultLocale}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localeBundle),
        },
      );
      if (!locRes.ok) {
        const err = await locRes.json();
        setStatus(err.error ?? "Failed to save locale copy");
        return;
      }
    }
    savedSnapshotRef.current = JSON.stringify({ config, localeBundle });
    setStatus("Project saved (config, copy, and screenshot links).");
  }

  function requestAppId(nextId: string) {
    if (nextId === appId) return;
    if (
      isDirty &&
      !confirm(
        "This project has unsaved changes. Switch apps anyway? (Uploads are already stored per app.)",
      )
    ) {
      return;
    }
    setAppId(nextId);
  }

  async function refreshScreenshots() {
    const shotsRes = await fetch(`/api/apps/${appId}/screenshots`);
    const shotsData = await shotsRes.json();
    if (shotsRes.ok && Array.isArray(shotsData)) {
      setScreenshots(shotsData);
    }
  }

  async function uploadScreenshot(file: File) {
    if (!config || !screen) return;
    setUploading(true);
    setStatus("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("screenId", screenId);
      const res = await fetch(`/api/apps/${appId}/screenshots`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus(data.error ?? "Upload failed");
        return;
      }
      if (data.config) {
        setConfig(data.config);
        savedSnapshotRef.current = JSON.stringify({
          config: data.config,
          localeBundle,
        });
      } else {
        updateScreen({ screenshot: data.filename });
      }
      await refreshScreenshots();
      setStatus(`Screenshot uploaded for ${screen.id}.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onScreenshotFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadScreenshot(file);
  }

  function onScreenshotDrop(e: React.DragEvent) {
    e.preventDefault();
    setShotDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadScreenshot(file);
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
            onChange={(e) => requestAppId(e.target.value)}
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
            <button type="button" className="btn btn-primary" onClick={saveProject}>
              Save project
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
            <p className="field-hint">
              Uploads are stored inside this app&apos;s project folder and linked
              to the selected screen.
            </p>
            <div
              className={`upload-drop${shotDragging ? " upload-drop-active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setShotDragging(true);
              }}
              onDragLeave={() => setShotDragging(false)}
              onDrop={onScreenshotDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                hidden
                onChange={onScreenshotFileChange}
              />
              <button
                type="button"
                className="btn"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Upload for this screen"}
              </button>
              <span className="upload-drop-hint">
                or drop PNG / JPEG here
              </span>
            </div>
            <div className="thumbs">
              {screenshots.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={screen.screenshot === f ? "selected" : ""}
                  onClick={() => updateScreen({ screenshot: f })}
                  title={f}
                >
                  <img
                    src={`/api/apps/${appId}/screenshot/${encodeURIComponent(f)}`}
                    alt={f}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Template</label>
            <TemplateSelect
              value={screen.template ?? config.template}
              onChange={(id) => updateScreen({ template: id })}
              templates={templates}
            />
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
                  onChange={(e) => {
                    const type = e.target.value as "iphone" | "ipad" | "mac";
                    updateScreen({
                      device: {
                        ...screen.device!,
                        type,
                        ...(type === "mac" ? { rotation: 0 } : {}),
                      },
                    });
                    const forPlatform = presets.filter((p) => p.platform === type);
                    if (
                      forPlatform.length > 0 &&
                      !forPlatform.some((p) => p.id === presetId)
                    ) {
                      const preferred =
                        type === "mac"
                          ? (config?.defaultMacPreset ?? "mac2880")
                          : type === "ipad"
                            ? "ipad13"
                            : (config?.defaultPreset ?? "iphone69");
                      const match = forPlatform.find((p) => p.id === preferred);
                      setPresetId(match?.id ?? forPlatform[0].id);
                    }
                  }}
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
          templates={templates}
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
  templates,
  onClose,
  onCreated,
}: {
  templates: TemplateOption[];
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
          <TemplateSelect
            value={template}
            onChange={setTemplate}
            templates={templates}
          />
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
