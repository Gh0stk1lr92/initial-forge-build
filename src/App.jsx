import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:        "#0a0a0f",
  surface:   "#12121a",
  panel:     "#1a1a26",
  border:    "#2a2a3d",
  accent:    "#7c6af7",
  accentLo:  "#4a3fa8",
  accentHi:  "#a78bfa",
  success:   "#34d399",
  danger:    "#f87171",
  text:      "#e8e6f0",
  textMid:   "#9490b0",
  textDim:   "#4a4870",
};

const EXAMPLES = [
  "A task manager with priorities, due dates, and a kanban board",
  "A personal finance tracker with income, expenses and a monthly chart",
  "A markdown note-taking app with live preview and tag filtering",
  "A workout logger that tracks sets, reps and weight over time",
  "A simple CRM for contacts, notes, and follow-up reminders",
  "A pomodoro timer with session history and daily stats",
];

const SYSTEM = `You are an expert React developer building a live demo app.

Return ONLY a complete self-contained React component as raw JSX — no markdown fences, no explanation, no commentary.

Rules:
- Use only React hooks (useState, useEffect, useCallback, useMemo, useRef)
- All styling must be inline styles only — no CSS files, no Tailwind, no classNames
- Use these colours where appropriate: bg #0a0a0f, surface #12121a, accent #7c6af7, text #e8e6f0, border #2a2a3d
- Include realistic mock data already populated so the app looks alive on load
- Handle empty states and basic error states
- The component MUST be named App and exported as default
- Do NOT use localStorage, sessionStorage, fetch, or any external APIs
- Make it genuinely polished — this is demo quality`;

async function streamClaude(apiKey, messages, onChunk) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: SYSTEM,
      stream: true,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        const delta = JSON.parse(raw)?.delta?.text || "";
        if (delta) { full += delta; onChunk(full); }
      } catch {}
    }
  }
  return full;
}

function Preview({ code }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !code) return;
    const doc = ref.current.contentDocument;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"><\/script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0f;color:#e8e6f0;font-family:system-ui,sans-serif;min-height:100vh}</style>
</head><body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
${code}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
<\/script></body></html>`);
    doc.close();
  }, [code]);

  return <iframe ref={ref} sandbox="allow-scripts" title="preview"
    style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, background: C.bg }} />;
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: C.accent,
          animation: `dot 1.2s ease-in-out ${i*0.2}s infinite`,
        }}/>
      ))}
      <style>{`@keyframes dot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </span>
  );
}

function KeyGate({ onKey }) {
  const [val, setVal] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState(false);

  const verify = async () => {
    const k = val.trim();
    if (!k.startsWith("sk-ant-")) { setErr("Key should start with sk-ant-"); return; }
    setChecking(true); setErr("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": k,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-haiku-20240307", max_tokens: 5, messages: [{ role: "user", content: "hi" }] }),
      });
      if (res.ok || res.status === 400) { onKey(k); }
      else {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error?.message || "Invalid API key");
      }
    } catch (e) { setErr("Could not reach Anthropic — check your connection"); }
    finally { setChecking(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${C.accent},${C.accentHi})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⚡</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.5px" }}>Forge</div>
            <div style={{ fontSize: 13, color: C.textMid }}>AI App Builder</div>
          </div>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Enter your Anthropic API key</h2>
        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6, marginBottom: 24 }}>
          Your key is used directly from your browser to call Claude. It's never stored on any server — only in your current session.
        </p>
        <div style={{ position: "relative", marginBottom: err ? 8 : 20 }}>
          <input
            type={show ? "text" : "password"}
            value={val}
            onChange={e => { setVal(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && verify()}
            placeholder="sk-ant-api03-..."
            style={{ width: "100%", padding: "12px 44px 12px 14px", background: C.panel, border: `1px solid ${err ? C.danger : C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
            autoFocus
          />
          <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMid, cursor: "pointer", fontSize: 16 }}>{show ? "🙈" : "👁"}</button>
        </div>
        {err && <div style={{ fontSize: 13, color: C.danger, marginBottom: 16, padding: "8px 12px", background: "#1f1010", borderRadius: 8, border: `1px solid #7f2020` }}>{err}</div>}
        <button onClick={verify} disabled={!val.trim() || checking}
          style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: val.trim() && !checking ? `linear-gradient(135deg,${C.accent},${C.accentHi})` : C.panel, color: val.trim() && !checking ? "#fff" : C.textDim, fontSize: 15, fontWeight: 600, cursor: val.trim() && !checking ? "pointer" : "not-allowed" }}>
          {checking ? "Verifying…" : "Launch Forge ⚡"}
        </button>
        <div style={{ marginTop: 20, padding: "14px", background: C.panel, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>Get a key:</strong> <a href="https://console.anthropic.com/keys" target="_blank" rel="noreferrer" style={{ color: C.accent }}>console.anthropic.com/keys</a><br/>
            New accounts get free credits. Usage costs ~$0.003 per app build.
          </div>
        </div>
      </div>
    </div>
  );
}

function Builder({ apiKey, onLogout }) {
  const [prompt, setPrompt]     = useState("");
  const [history, setHistory]   = useState([]);
  const [versions, setVersions] = useState([]);
  const [active, setActive]     = useState(null);
  const [building, setBuilding] = useState(false);
  const [streamBuf, setStream]  = useState("");
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState("preview");
  const [sidebar, setSidebar]   = useState(true);
  const taRef = useRef(null);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [history, streamBuf]);

  const code = building ? streamBuf : (active?.code ?? "");

  const build = useCallback(async () => {
    const msg = prompt.trim();
    if (!msg || building) return;
    setPrompt(""); setError(null);
    const msgs = [...history, { role: "user", content: msg }];
    setHistory(msgs);
    setBuilding(true); setStream(""); setTab("preview");
    try {
      const result = await streamClaude(apiKey, msgs.map(m => ({ role: m.role, content: m.content })), setStream);
      const ver = { label: `v${versions.length + 1} — ${msg.slice(0,42)}${msg.length>42?"…":""}`, code: result, ts: new Date().toLocaleTimeString() };
      setVersions(v => [...v, ver]);
      setActive(ver);
      setHistory(h => [...h, { role: "assistant", content: "✓ App generated. Describe changes to refine it." }]);
      setStream("");
    } catch(e) {
      setError(e.message);
      setHistory(h => [...h, { role: "assistant", content: `❌ ${e.message}` }]);
    } finally { setBuilding(false); }
  }, [prompt, history, versions, building, apiKey]);

  const onKey = e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) build(); };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, overflow: "hidden" }}>
      <div style={{ width: sidebar ? 280 : 0, minWidth: sidebar ? 280 : 0, transition: "all .25s", overflow: "hidden", background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},${C.accentHi})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Forge</div>
            <div style={{ fontSize: 11, color: C.textMid }}>AI App Builder</div>
          </div>
          <button onClick={onLogout} title="Change API key" style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12, padding: "4px 6px", borderRadius: 6 }}>🔑</button>
        </div>
        <div style={{ padding: "12px 14px 6px", fontSize: 11, fontWeight: 600, color: C.textMid, textTransform: "uppercase", letterSpacing: ".08em" }}>Versions</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {versions.length === 0
            ? <div style={{ padding: "10px 8px", color: C.textDim, fontSize: 13 }}>No builds yet.</div>
            : [...versions].reverse().map((v, i) => (
              <button key={i} onClick={() => { setActive(v); setTab("preview"); }}
                style={{ width: "100%", textAlign: "left", background: v===active ? C.panel : "transparent", border: `1px solid ${v===active ? C.accentLo : "transparent"}`, borderRadius: 8, padding: "9px 11px", marginBottom: 3, cursor: "pointer" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: v===active ? C.text : C.textMid, lineHeight: 1.4 }}>{v.label}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{v.ts}</div>
              </button>
            ))
          }
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 8px" }}>
          <div style={{ padding: "4px 8px 6px", fontSize: 11, fontWeight: 600, color: C.textMid, textTransform: "uppercase", letterSpacing: ".08em" }}>Examples</div>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => { setPrompt(ex); taRef.current?.focus(); }}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: C.textMid, lineHeight: 1.4 }}
              onMouseEnter={e=>e.currentTarget.style.color=C.text}
              onMouseLeave={e=>e.currentTarget.style.color=C.textMid}
            >{ex}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 52, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebar(s => !s)} style={{ background: "none", border: "none", color: C.textMid, cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 6 }}>{sidebar ? "◀" : "▶"}</button>
          <div style={{ display: "flex", gap: 2, background: C.panel, borderRadius: 8, padding: 3 }}>
            {["preview","code"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: tab===t ? C.accent : "transparent", color: tab===t ? "#fff" : C.textMid }}>
                {t === "preview" ? "⚡ Preview" : "</> Code"}
              </button>
            ))}
          </div>
          {active && <div style={{ marginLeft: "auto", fontSize: 12, color: C.textMid, background: C.panel, padding: "4px 11px", borderRadius: 20, border: `1px solid ${C.border}`, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.label}</div>}
          {building && <div style={{ marginLeft: active ? 8 : "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.accent }}><Dots /> Building…</div>}
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, padding: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {!code && !building
              ? <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textDim, gap: 14 }}>
                  <div style={{ fontSize: 56 }}>⚡</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: C.textMid }}>Describe an app to build it</div>
                  <div style={{ fontSize: 13 }}>Pick an example or type below</div>
                </div>
              : tab === "preview"
              ? <div style={{ flex: 1, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  {building
                    ? <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                        <Dots />
                        <div style={{ fontSize: 13, color: C.textMid }}>Generating your app…</div>
                        <div style={{ fontSize: 11, color: C.textDim }}>{streamBuf.length > 0 ? `${streamBuf.length.toLocaleString()} chars` : "Thinking…"}</div>
                      </div>
                    : <Preview code={code} />
                  }
                </div>
              : <div style={{ flex: 1, borderRadius: 10, overflow: "auto", border: `1px solid ${C.border}`, background: "#0d1117" }}>
                  <pre style={{ padding: 20, margin: 0, fontSize: 12, lineHeight: 1.65, color: "#c9d1d9", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{code || "// Code will appear here"}</pre>
                </div>
            }
          </div>

          <div style={{ width: 260, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.surface }}>
            <div style={{ padding: "10px 14px 8px", fontSize: 11, fontWeight: 600, color: C.textMid, textTransform: "uppercase", letterSpacing: ".08em", borderBottom: `1px solid ${C.border}` }}>Build log</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px 0" }}>
              {history.length === 0 && <div style={{ color: C.textDim, fontSize: 13 }}>Your conversation will appear here.</div>}
              {history.map((m, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: m.role==="user" ? C.accent : C.success, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>{m.role === "user" ? "You" : "Forge"}</div>
                  <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5, background: C.panel, borderRadius: 8, padding: "7px 10px", border: `1px solid ${C.border}` }}>{m.content}</div>
                </div>
              ))}
              {building && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.success, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>Forge</div>
                  <div style={{ fontSize: 12, color: C.textMid, background: C.panel, borderRadius: 8, padding: "7px 10px", border: `1px solid ${C.border}` }}><Dots /></div>
                </div>
              )}
              <div ref={chatEnd} />
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 14px", background: C.surface, flexShrink: 0 }}>
          {error && <div style={{ marginBottom: 10, padding: "8px 12px", background: "#1f1010", border: `1px solid #7f2020`, borderRadius: 8, fontSize: 13, color: C.danger }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea ref={taRef} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={onKey}
              placeholder={versions.length > 0 ? "Refine the app — add a feature, fix something…" : "Describe the app you want to build…"}
              rows={3}
              style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button onClick={build} disabled={!prompt.trim() || building}
              style={{ padding: "12px 18px", borderRadius: 10, border: "none", cursor: !prompt.trim()||building ? "not-allowed" : "pointer", background: !prompt.trim()||building ? C.panel : `linear-gradient(135deg,${C.accent},${C.accentHi})`, color: !prompt.trim()||building ? C.textDim : "#fff", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
              {building ? "Building…" : versions.length > 0 ? "Refine ⚡" : "Build ⚡"}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: C.textDim }}>Ctrl+Enter to build · Follow-up messages refine the app</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(null);
  if (!apiKey) return <KeyGate onKey={setApiKey} />;
  return <Builder apiKey={apiKey} onLogout={() => setApiKey(null)} />;
}