"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  adminNavigation,
  collectionConfigs,
  getCollectionConfig,
  isCollectionKey,
  mediaUsageOptions,
  type AdminCollectionConfig,
  type AdminCollectionKey,
  type AdminField,
  type AdminRecord,
  type AdminValue,
  type AdminViewKey
} from "@/lib/admin/schema";

type SessionState = {
  authenticated: boolean;
  configured: boolean;
  csrf: string;
  expiresAt: string;
};

type CollectionPayload = {
  config: AdminCollectionConfig;
  source: "local" | "notion";
  items: AdminRecord[];
};

type IntegrationDatabaseStatus = {
  key: string;
  label?: string;
  tableName?: string;
  legacyTableNames?: string[];
  status: string;
  databaseId?: string;
  env?: string;
  error?: string;
  expectedFields?: number;
  writableFields?: number;
  missingFields?: string[];
  typeMismatches?: string[];
};

type IntegrationStatus = {
  notion: {
    status: string;
    token: string;
    workspaceName: string;
    sourceMode: string;
    databases: IntegrationDatabaseStatus[];
  };
  oss: {
    status: string;
    bucket: string;
    region: string;
    publicBaseUrl: string;
    uploadPrefix: string;
    accessKeyId: string;
    hasSecret: boolean;
  };
  admin: {
    hasPasswordHash: boolean;
    hasSessionSecret: boolean;
    sessionSecretOk: boolean;
  };
};

type DashboardPayload = {
  source: string;
  summary: Record<string, number>;
  recentUpdates: AdminRecord[];
  recentMessages: AdminRecord[];
  integrations: IntegrationStatus;
};

type Toast = {
  tone: "success" | "error" | "info";
  message: string;
};

function valueToString(value: AdminValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === undefined || value === null) return "";
  return String(value);
}

function displayValue(value: AdminValue | undefined, field?: AdminField) {
  if (field?.type === "boolean") return value ? "Yes" : "No";
  const text = valueToString(value);
  if (field?.key.toLowerCase().includes("at") && text) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (field?.type === "url" && text.length > 42) return `${text.slice(0, 22)}...${text.slice(-14)}`;
  if (text.length > 80) return `${text.slice(0, 80)}...`;
  return text || "Empty";
}

function blankRecord(config: AdminCollectionConfig): Partial<AdminRecord> {
  const record: Partial<AdminRecord> = {};

  for (const field of config.fields) {
    if (field.readOnly) continue;
    if (field.type === "boolean") record[field.key] = false;
    else if (field.type === "number") record[field.key] = 0;
    else if (field.type === "select") record[field.key] = field.options?.[0] || "";
    else record[field.key] = "";
  }

  if ("status" in record) record.status = config.key === "works" ? "Draft" : config.key === "contact-messages" ? "New" : "Published";
  if ("visible" in record) record.visible = true;
  if ("homeVisible" in record) record.homeVisible = true;
  return record;
}

function titleForRecord(config: AdminCollectionConfig, record: Partial<AdminRecord> | null) {
  if (!record) return "No record selected";
  return valueToString(record[config.titleField]) || "Untitled";
}

export function AdminApp() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [view, setView] = useState<AdminViewKey>("dashboard");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [testResults, setTestResults] = useState<IntegrationDatabaseStatus[] | string>("");
  const [collectionPayload, setCollectionPayload] = useState<CollectionPayload | null>(null);
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState<Partial<AdminRecord>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dirty, setDirty] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadUsage, setUploadUsage] = useState("General");

  const csrf = session?.csrf || "";

  const showToast = useCallback((tone: Toast["tone"], message: string) => {
    setToast({ tone, message });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const adminFetch = useCallback(
    async <T,>(url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (init.body && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      if (csrf) headers.set("x-admin-csrf", csrf);

      const response = await fetch(url, {
        ...init,
        headers
      });
      const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Request failed.");
      }

      return payload;
    },
    [csrf]
  );

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/admin/session");
    const payload = (await response.json()) as SessionState;
    setSession(payload);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await adminFetch<DashboardPayload>("/api/admin/dashboard");
      setDashboard(payload);
      setIntegrations(payload.integrations);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Dashboard failed.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch, showToast]);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await adminFetch<IntegrationStatus>("/api/admin/integrations/status");
      setIntegrations(payload);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Integrations failed.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch, showToast]);

  const loadCollection = useCallback(
    async (key: AdminCollectionKey) => {
      setLoading(true);
      try {
        const payload = await adminFetch<CollectionPayload>(`/api/admin/${collectionConfigs[key].apiPath}`);
        setCollectionPayload(payload);
        setSelected(null);
        setForm({});
        setStatusFilter("All");
        setDirty(false);
      } catch (error) {
        showToast("error", error instanceof Error ? error.message : "Collection failed.");
      } finally {
        setLoading(false);
      }
    },
    [adminFetch, showToast]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSession();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.authenticated) return;
    const timer = window.setTimeout(() => {
      if (view === "dashboard") void loadDashboard();
      else if (view === "integrations") void loadIntegrations();
      else if (isCollectionKey(view)) void loadCollection(view);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCollection, loadDashboard, loadIntegrations, session?.authenticated, view]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Login failed.");
      setPassword("");
      await refreshSession();
      showToast("success", "Logged in.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
      setSession({ authenticated: false, configured: true, csrf: "", expiresAt: "" });
      setDashboard(null);
      setCollectionPayload(null);
      showToast("info", "Logged out.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Logout failed.");
    }
  }

  function updateField(field: AdminField, value: AdminValue) {
    if (field.readOnly) return;
    setForm((current) => ({ ...current, [field.key]: value }));
    setDirty(true);
  }

  function openRecord(record: AdminRecord) {
    setSelected(record);
    setForm(record);
    setDirty(false);
  }

  function startNew(config: AdminCollectionConfig) {
    setSelected(null);
    setForm(blankRecord(config));
    setDirty(true);
  }

  function shouldRevalidateAfterSave(config: AdminCollectionConfig) {
    return !["contact-messages", "media-assets"].includes(config.key);
  }

  async function revalidateAfterSave(config: AdminCollectionConfig) {
    if (!shouldRevalidateAfterSave(config)) return true;
    try {
      await adminFetch<{ revalidatedAt: string }>("/api/admin/revalidate", { method: "POST" });
      return true;
    } catch {
      return false;
    }
  }

  async function saveRecord(config: AdminCollectionConfig, patch: Partial<AdminRecord> = {}) {
    setLoading(true);
    try {
      const method = selected ? "PUT" : "POST";
      const path = selected ? `/api/admin/${config.apiPath}/${selected.id}` : `/api/admin/${config.apiPath}`;
      await adminFetch(path, {
        method,
        body: JSON.stringify({ ...form, ...patch })
      });
      const revalidated = await revalidateAfterSave(config);
      showToast(revalidated ? "success" : "info", revalidated ? "Saved and updated." : "Saved. Public cache may update later.");
      await loadCollection(config.key);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSelected(config: AdminCollectionConfig) {
    if (!selected) return;
    const message = config.deleteLabel === "Archive" ? "Archive this record?" : "Delete this record?";
    if (!window.confirm(message)) return;

    setLoading(true);
    try {
      await adminFetch(`/api/admin/${config.apiPath}/${selected.id}`, { method: "DELETE" });
      showToast("success", `${config.deleteLabel} complete.`);
      await loadCollection(config.key);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : `${config.deleteLabel} failed.`);
    } finally {
      setLoading(false);
    }
  }

  function duplicateSelected(config: AdminCollectionConfig) {
    if (!selected) return;
    const duplicated: Partial<AdminRecord> = { ...selected };
    delete duplicated.id;
    delete duplicated.createdAt;
    delete duplicated.updatedAt;
    if (typeof duplicated[config.titleField] === "string") duplicated[config.titleField] = `${duplicated[config.titleField]} Copy`;
    if (typeof duplicated.slug === "string") duplicated.slug = `${duplicated.slug}-copy`;
    if (config.key === "works") duplicated.status = "Draft";
    setSelected(null);
    setForm(duplicated);
    setDirty(true);
  }

  async function copyText(value: AdminValue | undefined, label: string) {
    const text = valueToString(value);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", `${label} copied.`);
    } catch {
      showToast("error", `Unable to copy ${label.toLowerCase()}.`);
    }
  }

  async function uploadMedia(config: AdminCollectionConfig) {
    if (!uploadFile) {
      showToast("error", "Choose a file first.");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.set("file", uploadFile);
      data.set("usage", uploadUsage);
      const result = await adminFetch<{ item?: AdminRecord }>("/api/admin/media/upload", {
        method: "POST",
        body: data
      });
      setUploadFile(null);
      if (config.key === "works" && typeof result.item?.url === "string") {
        if (uploadUsage === "Work Cover") {
          setForm((current) => ({ ...current, coverImage: result.item?.url || "" }));
        } else {
          setForm((current) => ({
            ...current,
            galleryImages: [valueToString(current.galleryImages), result.item?.url || ""].filter(Boolean).join("\n")
          }));
        }
        setDirty(true);
        showToast("success", "Uploaded and attached.");
        return;
      }
      if (typeof result.item?.url === "string" && ["tools", "social-links", "page-sections"].includes(config.key)) {
        const targetField = config.key === "page-sections" ? "mediaUrl" : "iconUrl";
        setForm((current) => ({ ...current, [targetField]: result.item?.url || "" }));
        setDirty(true);
        showToast("success", "Uploaded and attached.");
        return;
      }
      showToast("success", "Uploaded.");
      await loadCollection(config.key);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function revalidateSite() {
    setLoading(true);
    try {
      const result = await adminFetch<{ revalidatedAt: string }>("/api/admin/revalidate", { method: "POST" });
      showToast("success", `Revalidated at ${new Date(result.revalidatedAt).toLocaleTimeString()}.`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Revalidate failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runIntegrationTest(kind: "notion" | "oss") {
    setLoading(true);
    try {
      if (kind === "notion") {
        const result = await adminFetch<{ results: IntegrationDatabaseStatus[] }>("/api/admin/integrations/test-notion", { method: "POST" });
        setTestResults(result.results);
      } else {
        const result = await adminFetch<{ status: string; error?: string; objectKey?: string }>("/api/admin/integrations/test-oss", { method: "POST" });
        setTestResults(result.error ? `${result.status}: ${result.error}` : `${result.status}: ${result.objectKey || "ok"}`);
      }
      await loadIntegrations();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Test failed.");
    } finally {
      setLoading(false);
    }
  }

  const activeConfig = isCollectionKey(view) ? getCollectionConfig(view) : undefined;

  return (
    <main className="admin-shell">
      {toast ? (
        <div className="admin-toast" data-tone={toast.tone}>
          {toast.message}
        </div>
      ) : null}

      {!session?.authenticated ? (
        <section className="admin-login">
          <div className="admin-login-card">
            <span className="admin-mark" aria-hidden="true" />
            <p className="admin-kicker">Carl Wang Studio</p>
            <h1>Admin</h1>
            {!session?.configured ? (
              <p className="admin-alert">
                Admin auth is not configured. Set <code>ADMIN_PASSWORD_HASH</code> and <code>ADMIN_SESSION_SECRET</code> before login.
              </p>
            ) : null}
            <form className="admin-login-form" onSubmit={submitLogin}>
              <label>
                <span>Password</span>
                <input autoComplete="current-password" name="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
              </label>
              <button className="admin-button admin-button-primary" disabled={loading || !session?.configured} type="submit">
                {loading ? "Checking" : "Login"}
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section className="admin-console">
          <aside className="admin-sidebar">
            <div className="admin-brand">
              <span className="admin-mark" aria-hidden="true" />
              <div>
                <strong>Studio Admin</strong>
                <span>{dashboard?.source === "notion" ? "Notion source" : "Local fallback"}</span>
              </div>
            </div>
            <nav className="admin-nav" aria-label="Admin navigation">
              {adminNavigation.map((item) => (
                <button data-active={view === item.key} key={item.key} onClick={() => setView(item.key)} type="button">
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="admin-main">
            <header className="admin-header">
              <div>
                <p className="admin-kicker">{activeConfig?.label || view}</p>
                <h1>{activeConfig?.label || (view === "dashboard" ? "Dashboard" : view === "integrations" ? "Integrations" : "Security")}</h1>
              </div>
              <div className="admin-header-actions">
                {dirty ? <span className="admin-unsaved">Unsaved changes</span> : null}
                <button className="admin-button" disabled={loading} onClick={revalidateSite} type="button">
                  Revalidate Site
                </button>
                <button className="admin-button" onClick={logout} type="button">
                  Logout
                </button>
              </div>
            </header>

            {loading ? <div className="admin-loading">Loading</div> : null}
            {view === "dashboard" ? renderDashboard(dashboard, setView) : null}
            {view === "integrations" ? renderIntegrations(integrations, testResults, runIntegrationTest) : null}
            {view === "security" ? renderSecurity(session, integrations) : null}
            {activeConfig && collectionPayload ? renderCollection({
              config: activeConfig,
              payload: collectionPayload,
              selected,
              form,
              search,
              statusFilter,
              uploadFile,
              uploadUsage,
              onSearch: setSearch,
              onStatusFilter: setStatusFilter,
              onOpen: openRecord,
              onNew: startNew,
              onChange: updateField,
              onSave: saveRecord,
              onDelete: deleteSelected,
              onDuplicate: duplicateSelected,
              onCopyText: copyText,
              onUploadFile: setUploadFile,
              onUploadUsage: setUploadUsage,
              onUpload: uploadMedia
            }) : null}
          </div>
        </section>
      )}
    </main>
  );
}

function renderDashboard(dashboard: DashboardPayload | null, setView: (view: AdminViewKey) => void) {
  if (!dashboard) return null;

  const stats = [
    ["Published Works", dashboard.summary.publishedWorks],
    ["Draft Works", dashboard.summary.draftWorks],
    ["Featured Works", dashboard.summary.featuredWorks],
    ["Work Types", dashboard.summary.workTypes],
    ["Tools", dashboard.summary.tools],
    ["New Messages", dashboard.summary.newMessages],
    ["Visible Sections", dashboard.summary.pageSections]
  ];

  return (
    <div className="admin-dashboard">
      <section className="admin-status-grid">
        <StatusTile label="Site" tone="success" value="Running" />
        <StatusTile label="Notion" tone={dashboard.integrations.notion.status === "configured" ? "success" : "warning"} value={dashboard.integrations.notion.status} />
        <StatusTile label="OSS" tone={dashboard.integrations.oss.status === "configured" ? "success" : "warning"} value={dashboard.integrations.oss.status} />
        <StatusTile label="Admin Source" tone={dashboard.source === "notion" ? "success" : "warning"} value={dashboard.source} />
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Content Summary</h2>
        </div>
        <div className="admin-stat-grid">
          {stats.map(([label, value]) => (
            <div className="admin-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-dashboard-grid">
        <div className="admin-card">
          <div className="admin-card-head">
            <h2>Recent Updates</h2>
          </div>
          <RecordList records={dashboard.recentUpdates} />
        </div>
        <div className="admin-card">
          <div className="admin-card-head">
            <h2>Recent Messages</h2>
          </div>
          <RecordList records={dashboard.recentMessages} empty="No messages yet." />
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Quick Actions</h2>
        </div>
        <div className="admin-action-row">
          <button className="admin-button admin-button-primary" onClick={() => setView("works")} type="button">Add Work</button>
          <button className="admin-button" onClick={() => setView("media-assets")} type="button">Upload Media</button>
          <button className="admin-button" onClick={() => setView("page-sections")} type="button">Edit Home</button>
          <button className="admin-button" onClick={() => setView("about-experience")} type="button">Edit About</button>
          <button className="admin-button" onClick={() => setView("contact-messages")} type="button">View Messages</button>
        </div>
      </section>
    </div>
  );
}

function StatusTile({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "error" }) {
  return (
    <div className="admin-status-tile" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RecordList({ records, empty = "No recent updates." }: { records: AdminRecord[]; empty?: string }) {
  if (records.length === 0) return <p className="admin-empty">{empty}</p>;

  return (
    <ul className="admin-record-list">
      {records.map((record) => (
        <li key={record.id}>
          <span>{valueToString(record.title || record.name || record.platform || record.role || record.sectionKey || record.email) || "Untitled"}</span>
          <small>{displayValue(record.updatedAt || record.createdAt)}</small>
        </li>
      ))}
    </ul>
  );
}

type CollectionRenderProps = {
  config: AdminCollectionConfig;
  payload: CollectionPayload;
  selected: AdminRecord | null;
  form: Partial<AdminRecord>;
  search: string;
  statusFilter: string;
  uploadFile: File | null;
  uploadUsage: string;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onOpen: (record: AdminRecord) => void;
  onNew: (config: AdminCollectionConfig) => void;
  onChange: (field: AdminField, value: AdminValue) => void;
  onSave: (config: AdminCollectionConfig, patch?: Partial<AdminRecord>) => void;
  onDelete: (config: AdminCollectionConfig) => void;
  onDuplicate: (config: AdminCollectionConfig) => void;
  onCopyText: (value: AdminValue | undefined, label: string) => void;
  onUploadFile: (file: File | null) => void;
  onUploadUsage: (usage: string) => void;
  onUpload: (config: AdminCollectionConfig) => void;
};

function renderCollection(props: CollectionRenderProps) {
  const filteredItems = props.payload.items.filter((item) => {
    if (props.config.key === "contact-messages" && props.statusFilter !== "All" && item.status !== props.statusFilter) return false;
    if (!props.search.trim()) return true;
    const haystack = Object.values(item).map((value) => valueToString(value)).join(" ").toLowerCase();
    return haystack.includes(props.search.toLowerCase());
  });

  return (
    <div className="admin-workspace">
      <section className="admin-card admin-table-card">
        <div className="admin-card-head">
          <div>
            <h2>{props.config.label}</h2>
            <p>{props.config.description}</p>
          </div>
          <span className="admin-source">{props.payload.source}</span>
        </div>

        <div className="admin-toolbar">
          <input aria-label="Search records" onChange={(event) => props.onSearch(event.target.value)} placeholder="Search" value={props.search} />
          {props.config.key === "contact-messages" ? (
            <select aria-label="Filter messages by status" onChange={(event) => props.onStatusFilter(event.target.value)} value={props.statusFilter}>
              {["All", "New", "Read", "Replied", "Archived"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          ) : null}
          {props.config.allowCreate ? (
            <button className="admin-button admin-button-primary" onClick={() => props.onNew(props.config)} type="button">
              Add New
            </button>
          ) : null}
        </div>

        {["media-assets", "works", "tools", "social-links", "page-sections"].includes(props.config.key) ? renderUploadPanel(props) : null}

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {props.config.tableColumns.map((column) => (
                  <th key={column}>{props.config.fields.find((field) => field.key === column)?.label || column}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={props.config.tableColumns.length + 1}>No records.</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr data-active={props.selected?.id === item.id} key={item.id}>
                    {props.config.tableColumns.map((column) => {
                      const field = props.config.fields.find((candidate) => candidate.key === column);
                      return <td key={column}>{displayValue(item[column], field)}</td>;
                    })}
                    <td>
                      <button className="admin-link-button" onClick={() => props.onOpen(item)} type="button">
                        Edit
                      </button>
                      {props.config.key === "media-assets" && typeof item.url === "string" && item.url ? (
                        <>
                          <button className="admin-link-button" onClick={() => props.onCopyText(item.url, "File URL")} type="button">
                            Copy URL
                          </button>
                          <a className="admin-link-button" href={item.url} rel="noreferrer" target="_blank">
                            Preview
                          </a>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card admin-editor">
        <div className="admin-card-head">
          <div>
            <h2>{titleForRecord(props.config, props.selected || props.form)}</h2>
            <p>{props.selected ? "Edit record" : "Create or duplicate record"}</p>
          </div>
        </div>
        {Object.keys(props.form).length === 0 ? (
          <p className="admin-empty">Select a row or add a new record.</p>
        ) : (
          <form className="admin-form" onSubmit={(event) => {
            event.preventDefault();
            props.onSave(props.config);
          }}>
              {props.config.fields.map((field) => renderField(field, props.form[field.key], (value) => props.onChange(field, value)))}
              {props.config.key === "media-assets" && typeof props.form.url === "string" && props.form.url ? (
                <figure className="admin-media-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={valueToString(props.form.altEn) || valueToString(props.form.title) || "Media preview"} src={props.form.url} />
                  <figcaption>{valueToString(props.form.objectKey)}</figcaption>
                </figure>
              ) : null}
              <div className="admin-editor-actions">
                <button className="admin-button admin-button-primary" type="submit">Save</button>
                {props.config.key === "works" ? (
                  <>
                    <button className="admin-button" onClick={() => props.onSave(props.config, { status: "Draft" })} type="button">Save as Draft</button>
                    <button className="admin-button" onClick={() => props.onSave(props.config, { status: "Published" })} type="button">Publish</button>
                  </>
                ) : null}
                {props.config.key === "contact-messages" ? (
                  <>
                    <button className="admin-button" onClick={() => props.onSave(props.config, { status: "Read" })} type="button">Mark Read</button>
                    <button className="admin-button" onClick={() => props.onSave(props.config, { status: "Replied" })} type="button">Mark Replied</button>
                    <button className="admin-button" onClick={() => props.onCopyText(props.form.email, "Email")} type="button">Copy Email</button>
                  </>
                ) : null}
                {props.config.key === "media-assets" ? (
                  <>
                    <button className="admin-button" onClick={() => props.onCopyText(props.form.url, "File URL")} type="button">Copy URL</button>
                    {typeof props.form.url === "string" && props.form.url ? (
                      <a className="admin-button" href={props.form.url} rel="noreferrer" target="_blank">Preview</a>
                    ) : null}
                  </>
                ) : null}
                {props.selected ? <button className="admin-button" onClick={() => props.onDuplicate(props.config)} type="button">Duplicate</button> : null}
              {props.selected && props.config.allowDelete ? (
                <button className="admin-button admin-button-danger" onClick={() => props.onDelete(props.config)} type="button">
                  {props.config.deleteLabel}
                </button>
              ) : null}
              {props.config.key === "works" && typeof props.form.slug === "string" && props.form.slug ? (
                <a className="admin-button" href={`/works/${props.form.slug}`} rel="noreferrer" target="_blank">Preview</a>
              ) : null}
              {typeof props.form.notionUrl === "string" && props.form.notionUrl ? (
                <a className="admin-button" href={props.form.notionUrl} rel="noreferrer" target="_blank">Open in Notion</a>
              ) : null}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function renderUploadPanel(props: CollectionRenderProps) {
  return (
    <div className="admin-upload-panel">
      <select aria-label="Media usage" onChange={(event) => props.onUploadUsage(event.target.value)} value={props.uploadUsage}>
        {mediaUsageOptions.map((usage) => (
          <option key={usage} value={usage}>{usage}</option>
        ))}
      </select>
      <input
        aria-label="Upload media"
        onChange={(event) => props.onUploadFile(event.target.files?.[0] || null)}
        type="file"
      />
      <button className="admin-button" disabled={!props.uploadFile} onClick={() => props.onUpload(props.config)} type="button">
        Upload to OSS
      </button>
    </div>
  );
}

function renderField(field: AdminField, value: AdminValue | undefined, onChange: (value: AdminValue) => void) {
  const text = valueToString(value);

  if (field.type === "readonly" || field.readOnly) {
    return (
      <label className="admin-field" key={field.key}>
        <span>{field.label}</span>
        {field.type === "textarea" ? <textarea disabled value={text} /> : <output>{displayValue(value, field)}</output>}
      </label>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="admin-check-field" key={field.key}>
        <input checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="admin-field" key={field.key}>
        <span>{field.label}</span>
        <select onChange={(event) => onChange(event.target.value)} value={text}>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="admin-field" key={field.key}>
        <span>{field.label}</span>
        <textarea onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} value={text} />
      </label>
    );
  }

  return (
    <label className="admin-field" key={field.key}>
      <span>{field.label}</span>
      <input
        onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
        placeholder={field.placeholder}
        type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "date" ? "date" : "text"}
        value={text}
      />
    </label>
  );
}

function schemaStatusText(database: IntegrationDatabaseStatus) {
  const issueCount = (database.missingFields?.length || 0) + (database.typeMismatches?.length || 0);
  if (issueCount === 0) return `${database.expectedFields || 0} fields`;
  return `${issueCount} issue${issueCount === 1 ? "" : "s"}`;
}

function schemaDetails(database: IntegrationDatabaseStatus) {
  const details = [
    ...(database.missingFields || []).map((field) => `Missing ${field}`),
    ...(database.typeMismatches || []).map((field) => `Mismatch ${field}`)
  ];
  return details.slice(0, 3).join(" | ");
}

function renderIntegrations(
  integrations: IntegrationStatus | null,
  testResults: IntegrationDatabaseStatus[] | string,
  runIntegrationTest: (kind: "notion" | "oss") => void
) {
  if (!integrations) return null;

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard-grid">
        <div className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Notion</h2>
              <p>Token: {integrations.notion.token || "missing"}</p>
            </div>
            <button className="admin-button" onClick={() => runIntegrationTest("notion")} type="button">Test Connection</button>
          </div>
          <div className="admin-meta-grid">
            <span>Mode</span><strong>{integrations.notion.sourceMode}</strong>
            <span>Status</span><strong>{integrations.notion.status}</strong>
            <span>Workspace</span><strong>{integrations.notion.workspaceName || "Not configured"}</strong>
          </div>
          <table className="admin-table admin-compact-table">
            <thead>
              <tr><th>Database</th><th>Status</th><th>ID</th><th>Schema</th></tr>
            </thead>
            <tbody>
              {integrations.notion.databases.map((database) => (
                <tr key={database.key}>
                  <td>{database.tableName || database.label || database.key}</td>
                  <td>{database.status}</td>
                  <td>{database.databaseId || "Missing"}</td>
                  <td title={schemaDetails(database)}>{schemaStatusText(database)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Aliyun OSS</h2>
              <p>Access Key: {integrations.oss.accessKeyId || "missing"}</p>
            </div>
            <button className="admin-button" onClick={() => runIntegrationTest("oss")} type="button">Test Upload</button>
          </div>
          <div className="admin-meta-grid">
            <span>Status</span><strong>{integrations.oss.status}</strong>
            <span>Bucket</span><strong>{integrations.oss.bucket || "Missing"}</strong>
            <span>Region</span><strong>{integrations.oss.region || "Missing"}</strong>
            <span>Public URL</span><strong>{integrations.oss.publicBaseUrl || "Missing"}</strong>
            <span>Prefix</span><strong>{integrations.oss.uploadPrefix}</strong>
            <span>Secret</span><strong>{integrations.oss.hasSecret ? "Configured" : "Missing"}</strong>
          </div>
        </div>
      </section>

      {testResults ? (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Latest Test Result</h2>
          </div>
          {Array.isArray(testResults) ? (
            <table className="admin-table admin-compact-table">
              <tbody>
                {testResults.map((result) => (
                  <tr key={result.key}>
                    <td>{result.key}</td>
                    <td>{result.status}</td>
                    <td>{result.error || schemaDetails(result) || result.databaseId || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>{testResults}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function renderSecurity(session: SessionState, integrations: IntegrationStatus | null) {
  return (
    <div className="admin-dashboard">
      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Session</h2>
        </div>
        <div className="admin-meta-grid">
          <span>Authenticated</span><strong>{session.authenticated ? "Yes" : "No"}</strong>
          <span>Expires At</span><strong>{session.expiresAt ? new Date(session.expiresAt).toLocaleString() : "Missing"}</strong>
          <span>Password Hash</span><strong>{integrations?.admin.hasPasswordHash ? "Configured" : "Missing"}</strong>
          <span>Session Secret</span><strong>{integrations?.admin.sessionSecretOk ? "Configured" : "Needs 32+ characters"}</strong>
        </div>
      </section>
      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Password Hash</h2>
        </div>
        <p className="admin-copy">Generate a bcrypt hash locally, then set it as <code>ADMIN_PASSWORD_HASH</code> in your server environment.</p>
        <pre className="admin-code">{'npm run admin:hash -- "A-Strong-Password-123!"'}</pre>
        <p className="admin-copy">Password rules: at least 12 characters with uppercase, lowercase, number and special character. Changing the env hash requires logging in again.</p>
      </section>
    </div>
  );
}
