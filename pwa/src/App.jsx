import { useState, useEffect } from "react";
import { SignInButton, useAuth, useUser } from "@clerk/react";
import Logo from "./Logo";
import "./App.css";

/* ---------- theme + helpers ---------- */
const T = { bg: "#0B0B0F", card: "#16161D", text: "#fff", muted: "#8A8A96", acc: "#C6FF3D", miss: "#FF4D4D", cb: "#4DA3FF" };
const FONT = "Inter, system-ui, -apple-system, Segoe UI, sans-serif";
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sched = (h, d) => h.days.includes(d.getDay());
const uid = () => Math.random().toString(36).slice(2, 9);
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GOALS = ["Fitness", "Study", "Career", "Mental Health", "Money", "Screen Time", "Other"];
const STRUGGLES = ["Low energy", "Distractions", "Inconsistent schedule", "Losing motivation", "Forgetting"];
const SUGGEST = {
  Fitness: ["Workout", "Walk 8,000 steps", "Drink 2L water"], Study: ["Study 1 hour", "Read 20 min", "Review notes"],
  Career: ["Deep work 90 min", "Learn a new skill", "Reach out to 1 person"], "Mental Health": ["Meditate 10 min", "Journal", "Sleep by 11pm"],
  Money: ["Log expenses", "No impulse buys", "Review budget"], "Screen Time": ["No phone before 9am", "Phone off by 10pm", "No social media 1hr"],
  Other: ["Make your bed", "Plan tomorrow", "Read 20 min"],
};
const REASONS = ["Tired", "Busy", "Forgot", "Unmotivated", "Other"];
const FREE = { habits: 3, goals: 1, days: 7 };
const ALL = [0, 1, 2, 3, 4, 5, 6];

/* ---------- core logic (same rules as the React Native version) ---------- */
const bridged = (s, hid) => s.reasons.filter(r => r.h === hid && s.checks.some(c => c.h === hid && c.type === "min" && c.date > r.date && c.date <= r.until)).map(r => r.date);
function streak(s, h, today = new Date()) {
  const done = new Set(s.checks.filter(c => c.h === h.id).map(c => c.date)), br = bridged(s, h.id);
  let n = 0, d = today;
  if (sched(h, d) && !done.has(iso(d))) d = add(d, -1);
  for (let i = 0; i < 1000; i++, d = add(d, -1)) {
    if (!sched(h, d)) continue;
    if (done.has(iso(d))) n++; else if (br.includes(iso(d))) continue; else break;
  }
  return n;
}
function best(s, h) {
  const done = new Set(s.checks.filter(c => c.h === h.id).map(c => c.date));
  let b = 0, c = 0;
  for (let d = new Date(h.created); d <= new Date(); d = add(d, 1)) { if (!sched(h, d)) continue; c = done.has(iso(d)) ? c + 1 : 0; b = Math.max(b, c); }
  return b;
}
const did = (s, hid, d) => s.checks.some(c => c.h === hid && c.date === iso(d));
function score(s, today = new Date()) {
  if (!s.habits.length) return 0;
  const td = s.habits.filter(h => sched(h, today));
  const comp = td.length ? td.filter(h => did(s, h.id, today)).length / td.length : 1;
  let due = 0, hit = 0;
  for (let i = 1; i <= 14; i++) { const d = add(today, -i); s.habits.forEach(h => { if (sched(h, d)) { due++; if (did(s, h.id, d)) hit++; } }); }
  const health = s.habits.reduce((a, h) => a + Math.min(streak(s, h, today) / 21, 1), 0) / s.habits.length;
  return Math.round(100 * (0.5 * comp + 0.3 * (due ? hit / due : 0) + 0.2 * health));
}
function note(name, rs) {
  const by = {}; rs.forEach(r => { const k = new Date(r.date + "T00:00").getDay(); by[k] = (by[k] || 0) + 1; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  if (!top) return `First miss logged for ${name}. We'll watch for patterns.`;
  return top[1] >= 2 ? `You've missed ${name} on ${top[1]} ${DAY[+top[0]]}s.` : `${rs.length} misses logged so far. Keep going.`;
}
// Stand-in for the AI call: swap for a request to your backend (which calls the LLM API).
const MIN = { workout: "10 pushups", "read 20 min": "Read 1 page", journal: "Write 1 sentence", "meditate 10 min": "3 deep breaths" };
const minimumFor = name => MIN[name.toLowerCase()] || "Do it for 2 minutes";

/* ---------- state ---------- */
const KEY = "stakes-web-v1";
const init = { screen: "welcome", goals: [], struggle: null, picks: [], time: "08:00", habits: [], checks: [], reasons: [], goalList: [], premium: false, tab: "today", view: null };
function useStakes() {
  const [s, setS] = useState(() => { try { return { ...init, ...JSON.parse(localStorage.getItem(KEY)), premium: false }; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s]);
  return [s, p => setS(x => ({ ...x, ...(typeof p === "function" ? p(x) : p) }))];
}

/* ---------- ui bits ---------- */
const Btn = ({ children, onClick, disabled, ghost, style }) => (
  <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: 18, borderRadius: 16, border: 0, fontSize: 17, fontWeight: 700, fontFamily: FONT, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, background: ghost ? "transparent" : T.acc, color: ghost ? T.muted : T.bg, ...style }}>{children}</button>
);
const Card = ({ children, on, style, onClick }) => (
  <div onClick={onClick} style={{ background: T.card, borderRadius: 16, padding: 18, border: `1.5px solid ${on ? T.acc : "transparent"}`, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);
const H1 = ({ children }) => <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{children}</h1>;
const Muted = ({ children, style }) => <div style={{ color: T.muted, fontSize: 15, fontWeight: 500, ...style }}>{children}</div>;
const Col = ({ children, style }) => <div style={{ display: "flex", flexDirection: "column", gap: 14, ...style }}>{children}</div>;
const Progress = ({ n }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ flex: 1, height: 6, background: T.card, borderRadius: 3 }}><div style={{ width: `${n * 25}%`, height: 6, background: T.acc, borderRadius: 3, transition: "width .3s" }} /></div>
    <Muted>{n}/4</Muted>
  </div>
);
function Ring({ v, size = 84 }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#2A2A33" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={T.acc} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset .6s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: size / 3, fontWeight: 800 }}>{v}</div>
    </div>
  );
}
const Check = ({ on, tint = T.acc, onClick }) => (
  <button onClick={e => { e.stopPropagation(); onClick(); }} style={{ width: 32, height: 32, borderRadius: 10, border: `2px solid ${on ? tint : "#3A3A45"}`, background: on ? tint : "transparent", color: T.bg, fontWeight: 800, cursor: "pointer", transition: "transform .15s", transform: on ? "scale(1.08)" : "scale(1)" }}>{on ? "✓" : ""}</button>
);
const input = { width: "100%", boxSizing: "border-box", background: T.card, color: T.text, border: 0, borderRadius: 16, padding: 16, fontSize: 16, fontFamily: FONT, fontWeight: 600 };
const chip = on => ({ padding: "12px 16px", borderRadius: 16, background: T.card, color: on ? T.acc : T.text, border: `1.5px solid ${on ? T.acc : "transparent"}`, fontSize: 16, fontWeight: 600, fontFamily: FONT, cursor: "pointer" });

/* ---------- onboarding ---------- */
function Welcome({ set }) {
  return (
    <Col style={{ minHeight: "100%", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}><Logo size={96} /><div style={{ color: T.acc, fontSize: 24, fontWeight: 800, letterSpacing: 6 }}>STAKES</div></div>
      <Col style={{ gap: 28 }}>
        <H1>Discipline isn't motivation. It's a system.</H1>
        {["Track habits that matter", "Hit goals with milestones", "An AI coach that calls you out"].map(b => (
          <div key={b} style={{ display: "flex", gap: 12, alignItems: "center", fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: T.acc }} />{b}</div>
        ))}
      </Col>
      <Btn onClick={() => set({ screen: "q1" })}>Get Started</Btn>
    </Col>
  );
}
function Q({ n, title, next, ok, children }) {
  return (<Col style={{ minHeight: "100%" }}><Progress n={n} /><H1>{title}</H1><Col style={{ flex: 1, gap: 10 }}>{children}</Col>{next}</Col>);
}
function Onboarding({ s, set }) {
  const sc = s.screen;
  if (sc === "q1") return (
    <Q n={1} title="What are you locking in on?" next={<Btn disabled={!s.goals.length} onClick={() => set({ screen: "q2" })}>Continue</Btn>}>
      {GOALS.map(g => <Card key={g} on={s.goals.includes(g)} onClick={() => set({ goals: s.goals.includes(g) ? s.goals.filter(x => x !== g) : [...s.goals, g] })}>{g}</Card>)}
    </Q>);
  if (sc === "q2") return (
    <Q n={2} title="What usually breaks your streaks?" next={<Btn disabled={!s.struggle} onClick={() => set({ screen: "q3" })}>Continue</Btn>}>
      {STRUGGLES.map(g => <Card key={g} on={s.struggle === g} onClick={() => set({ struggle: g })}>{g}</Card>)}
    </Q>);
  if (sc === "q3") {
    const opts = [...new Set([...(s.goals.length ? s.goals : ["Other"]).flatMap(g => SUGGEST[g]), ...s.picks])].slice(0, 12);
    const tog = h => set({ picks: s.picks.includes(h) ? s.picks.filter(x => x !== h) : s.picks.length < 3 ? [...s.picks, h] : s.picks });
    return (
      <Q n={3} title="Pick 3 habits to start." next={<Btn disabled={!s.picks.length} onClick={() => set({ screen: "q4" })}>Continue</Btn>}>
        <Muted>{s.picks.length}/3 selected</Muted>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {opts.map(h => <button key={h} style={chip(s.picks.includes(h))} onClick={() => tog(h)}>{h}</button>)}
          <button style={{ ...chip(false), border: `1.5px dashed ${T.muted}`, color: T.muted }} onClick={() => { const n = (prompt("Habit name") || "").trim(); if (n && s.picks.length < 3) set({ picks: [...s.picks, n] }); }}>+ Custom</button>
        </div>
      </Q>);
  }
  if (sc === "q4") {
    const go = () => set(x => ({ screen: "plan", habits: x.habits.length ? x.habits : x.picks.map(n => ({ id: uid(), name: n, days: ALL, created: new Date().toISOString() })) }));
    return (
      <Q n={4} title="When should we hold you accountable?" next={<Col><Btn onClick={() => { try { Notification.requestPermission(); } catch {} go(); }}>Enable Reminders</Btn><Btn ghost onClick={go}>Skip</Btn></Col>}>
        <input type="time" value={s.time} onChange={e => set({ time: e.target.value })} style={{ ...input, fontSize: 40, textAlign: "center", marginTop: 40 }} />
      </Q>);
  }
  if (sc === "plan") return (
    <Col style={{ minHeight: "100%" }}>
      <H1>Your 30-day discipline plan is ready.</H1>
      <Col style={{ flex: 1, gap: 10 }}>
        {s.habits.map(h => (
          <Card key={h.id}><div style={{ fontWeight: 700, marginBottom: 10 }}>{h.name}</div>
            <div style={{ display: "flex", gap: 6 }}>{ALL.map(i => <span key={i} style={{ width: 14, height: 14, borderRadius: 4, background: i === 0 ? T.acc : "#2A2A33" }} />)}</div></Card>))}
        <Card style={{ filter: "blur(3px)", opacity: 0.8 }}><b>AI Coach insights 🔒</b><Muted>Your patterns, weak spots, weekly plan.</Muted></Card>
      </Col>
      <Btn onClick={() => set({ screen: "paywall" })}>Continue</Btn>
    </Col>);
  return null;
}
function Paywall({ set, back, onCheckout, checkoutBusy, checkoutError }) {
  const { isSignedIn } = useAuth();
  const close = () => set({ screen: "app", ...(back || {}) });
  return (
    <Col style={{ minHeight: "100%" }}>
      <button onClick={close} style={{ alignSelf: "flex-end", background: 0, border: 0, color: T.muted, fontSize: 28, cursor: "pointer" }}>✕</button>
      <H1>Go Stakes Premium</H1>
      <Col style={{ gap: 12 }}>{["Unlimited habits & goals", "AI Coach", "Comeback Mode", "Full Insights", "Widgets", "Off-track alerts"].map(f => <div key={f} style={{ fontWeight: 600 }}><span style={{ color: T.acc }}>✓ </span>{f}</div>)}</Col>
      <Card on style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontSize: 20, fontWeight: 800 }}>$5.49 / month</div><Muted>7-day free trial, then billed monthly</Muted></div>
      </Card>
      <div style={{ flex: 1 }} />
      {isSignedIn
        ? <Btn disabled={checkoutBusy} onClick={onCheckout}>{checkoutBusy ? "Opening secure checkout…" : "Start 7-day free trial"}</Btn>
        : <SignInButton mode="modal"><Btn>Sign in to continue</Btn></SignInButton>}
      {checkoutError && <Muted style={{ color: T.miss }}>{checkoutError}</Muted>}
      <Muted style={{ textAlign: "center", fontSize: 13 }}>Cancel anytime. Billed $5.49 monthly after trial.</Muted>
      <Muted style={{ textAlign: "center", fontSize: 13 }}>Secure checkout powered by Dodo Payments.</Muted>
    </Col>);
}

/* ---------- tabs ---------- */
function Today({ s, set }) {
  const now = new Date(), today = iso(now);
  const todays = s.habits.filter(h => sched(h, now));
  const y = add(now, -1), yi = iso(y);
  const missed = s.habits.find(h => sched(h, y) && new Date(h.created) <= y && !did(s, h.id, y) && !s.reasons.some(r => r.h === h.id && r.date === yi));
  const [noteTxt, setNoteTxt] = useState(null);
  const paywall = () => set({ screen: "paywall" });
  const pick = reason => {
    const prior = s.reasons.filter(r => r.h === missed.id);
    const r = { id: uid(), h: missed.id, date: yi, reason, until: iso(add(now, 3)), min: s.premium ? minimumFor(missed.name) : null };
    set({ reasons: [...s.reasons, r] });
    setNoteTxt(note(missed.name, [...prior, r]) + (r.min ? `  Next 3 days: ${r.min}.` : ""));
  };
  const toggle = (h, type) => set(x => did(x, h.id, now) ? { checks: x.checks.filter(c => !(c.h === h.id && c.date === today)) } : { checks: [...x.checks, { h: h.id, date: today, type }] });
  const add_ = () => (!s.premium && s.habits.length >= FREE.habits ? paywall() : set({ view: { t: "newHabit" } }));

  return (
    <Col>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><H1>Today, {DAY[now.getDay()]}</H1><Muted>Discipline Score</Muted></div><Ring v={score(s)} />
      </div>
      {(missed || noteTxt) && (
        <Card style={{ borderColor: T.cb }}>
          {noteTxt ? <div style={{ fontWeight: 700 }}>{noteTxt}{!s.premium && <div style={{ color: T.muted, marginTop: 8, cursor: "pointer" }} onClick={paywall}>🔒 Get an AI minimum version with Premium</div>}</div> : (
            <Col style={{ gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>You missed {missed.name}. No lecture. What happened?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{REASONS.map(r => <button key={r} style={{ ...chip(false), background: "#22222B", padding: "10px 14px" }} onClick={() => pick(r)}>{r}</button>)}</div>
            </Col>)}
        </Card>)}
      {!todays.length && <Muted>Nothing scheduled today.</Muted>}
      {todays.map(h => {
        const rs = s.reasons.find(r => r.h === h.id && today > r.date && today <= r.until);
        const useMin = !!rs?.min, comeback = !!rs && s.checks.some(c => c.h === h.id && c.type === "min" && c.date <= rs.until);
        const done = did(s, h.id, now);
        return (
          <Card key={h.id} onClick={() => set({ view: { t: "habit", id: h.id } })} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Check on={done} tint={useMin ? T.cb : T.acc} onClick={() => toggle(h, useMin ? "min" : "normal")} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, textDecoration: done ? "line-through" : "none" }}>{h.name}</div>
              {useMin && !done && <div style={{ color: T.cb, fontSize: 13, fontWeight: 600 }}>Minimum: {rs.min}</div>}</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: comeback ? T.cb : T.text }}>🔥 {streak(s, h)}</div>
          </Card>);
      })}
      <button onClick={add_} style={{ alignSelf: "center", width: 60, height: 60, borderRadius: 30, border: 0, background: T.acc, color: T.bg, fontSize: 32, cursor: "pointer" }}>+</button>
    </Col>);
}
function HabitDetail({ s, set, id }) {
  const h = s.habits.find(x => x.id === id); if (!h) return null;
  const now = new Date(), start = new Date(h.created); start.setHours(0, 0, 0, 0);
  const cells = Array.from({ length: 30 }, (_, i) => add(now, i - 29));
  let due = 0, hit = 0;
  cells.forEach(d => { if (d >= start && sched(h, d) && iso(d) !== iso(now)) { due++; if (did(s, h.id, d)) hit++; } });
  const col = d => { const c = s.checks.find(x => x.h === h.id && x.date === iso(d)); if (c) return c.type === "min" ? T.cb : T.acc; return d < start || !sched(h, d) || iso(d) >= iso(now) ? "#22222B" : T.miss; };
  return (
    <Col>
      <button onClick={() => set({ view: null })} style={{ alignSelf: "flex-start", background: 0, border: 0, color: T.muted, cursor: "pointer", fontSize: 16 }}>‹ Back</button>
      <H1>{h.name}</H1>
      <div style={{ display: "flex", gap: 10 }}>
        {[["Current", streak(s, h)], ["Best", best(s, h)], ["30-day", `${due ? Math.round((hit / due) * 100) : 0}%`]].map(([l, v]) => <Card key={l} style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 800 }}>{v}</div><Muted style={{ fontSize: 13 }}>{l}</Muted></Card>)}
      </div>
      <Card><Muted>Last 30 days</Muted><div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6, marginTop: 10 }}>{cells.map(d => <div key={iso(d)} style={{ aspectRatio: "1", borderRadius: 6, background: col(d) }} />)}</div></Card>
      <Btn ghost style={{ color: T.miss }} onClick={() => confirm("Delete habit?") && set(x => ({ view: null, habits: x.habits.filter(k => k.id !== id), checks: x.checks.filter(c => c.h !== id), reasons: x.reasons.filter(r => r.h !== id) }))}>Delete Habit</Btn>
    </Col>);
}
function NewHabit({ s, set }) {
  const [name, setName] = useState(""), [days, setDays] = useState(ALL);
  return (
    <Col>
      <H1>New habit</H1>
      <input autoFocus style={input} placeholder="e.g. Workout" value={name} onChange={e => setName(e.target.value)} />
      <Muted>Repeat on</Muted>
      <div style={{ display: "flex", justifyContent: "space-between" }}>{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <button key={i} onClick={() => setDays(x => x.includes(i) ? x.filter(k => k !== i) : [...x, i])} style={{ width: 42, height: 42, borderRadius: 21, border: 0, fontWeight: 700, cursor: "pointer", background: days.includes(i) ? T.acc : T.card, color: days.includes(i) ? T.bg : T.text }}>{d}</button>)}</div>
      <Btn disabled={!name.trim() || !days.length} onClick={() => set({ view: null, habits: [...s.habits, { id: uid(), name: name.trim(), days, created: new Date().toISOString() }] })}>Add Habit</Btn>
      <Btn ghost onClick={() => set({ view: null })}>Cancel</Btn>
    </Col>);
}
function Goals({ s, set }) {
  const left = d => Math.ceil((new Date(d + "T23:59:59") - Date.now()) / 86400000);
  const go = () => (!s.premium && s.goalList.length >= FREE.goals ? set({ screen: "paywall" }) : set({ view: { t: "newGoal" } }));
  return (
    <Col>
      <H1>Goals</H1>
      {!s.goalList.length && <Muted>No goals yet. Set a target date and link the habits that get you there.</Muted>}
      {s.goalList.map(g => {
        const p = g.ms.length ? Math.round((g.ms.filter(m => m.done).length / g.ms.length) * 100) : 0, dl = left(g.date);
        return (
          <Card key={g.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ fontSize: 18 }}>{g.title}</b><span style={{ color: dl < 0 ? T.miss : T.muted, fontWeight: 600 }}>{dl < 0 ? "Overdue" : `${dl}d left`}</span></div>
            <div style={{ height: 8, background: "#2A2A33", borderRadius: 4, margin: "12px 0" }}><div style={{ height: 8, width: `${p}%`, background: T.acc, borderRadius: 4 }} /></div>
            <Muted style={{ fontSize: 13 }}>{p}% · {g.linked.map(id => s.habits.find(h => h.id === id)?.name).filter(Boolean).join(", ") || "No linked habits"}</Muted>
            {g.ms.map((m, i) => <div key={i} onClick={() => set({ goalList: s.goalList.map(k => k.id === g.id ? { ...k, ms: k.ms.map((z, j) => j === i ? { ...z, done: !z.done } : z) } : k) })} style={{ marginTop: 10, cursor: "pointer", fontWeight: 600, color: m.done ? T.muted : T.text, textDecoration: m.done ? "line-through" : "none" }}><span style={{ color: m.done ? T.acc : T.muted }}>{m.done ? "● " : "○ "}</span>{m.t}</div>)}
          </Card>);
      })}
      <Btn onClick={go}>+ New Goal</Btn>
    </Col>);
}
function NewGoal({ s, set }) {
  const [title, setTitle] = useState(""), [date, setDate] = useState(iso(add(new Date(), 30))), [linked, setLinked] = useState([]), [ms, setMs] = useState([]), [d, setD] = useState("");
  const addMs = () => { if (d.trim() && ms.length < 5) setMs([...ms, { t: d.trim(), done: false }]); setD(""); };
  return (
    <Col>
      <H1>New goal</H1>
      <input style={input} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <Muted>Target date</Muted><input type="date" style={input} value={date} onChange={e => setDate(e.target.value)} />
      <Muted>Link habits</Muted>
      {s.habits.map(h => <Card key={h.id} on={linked.includes(h.id)} onClick={() => setLinked(l => l.includes(h.id) ? l.filter(x => x !== h.id) : [...l, h.id])}>{h.name}</Card>)}
      <Muted>Milestones ({ms.length}/5)</Muted>
      {ms.map((m, i) => <div key={i} style={{ fontWeight: 600 }}>• {m.t}</div>)}
      {ms.length < 5 && <input style={input} placeholder="Add milestone, press Enter" value={d} onChange={e => setD(e.target.value)} onKeyDown={e => e.key === "Enter" && addMs()} />}
      <Btn disabled={!title.trim()} onClick={() => set({ view: null, goalList: [...s.goalList, { id: uid(), title: title.trim(), date, linked, ms }] })}>Create Goal</Btn>
      <Btn ghost onClick={() => set({ view: null })}>Cancel</Btn>
    </Col>);
}
function Insights({ s, set }) {
  const span = s.premium ? 30 : FREE.days, now = new Date();
  const days = Array.from({ length: span }, (_, i) => add(now, i - (span - 1)));
  const rate = d => { const due = s.habits.filter(h => sched(h, d)); return due.length ? due.filter(h => did(s, h.id, d)).length / due.length : null; };
  const week = days.slice(-7), trend = days.map(d => score(s, d));
  const by = {}; days.forEach(d => { const r = rate(d); if (r !== null) (by[d.getDay()] ||= []).push(r); });
  const avg = Object.entries(by).map(([k, v]) => [+k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1]);
  const pts = trend.map((v, i) => `${(i / Math.max(trend.length - 1, 1)) * 300},${90 - v * 0.9}`).join(" ");
  const cnt = {}; s.reasons.forEach(r => (cnt[r.reason] = (cnt[r.reason] || 0) + 1));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return (
    <Col>
      <H1>Insights</H1>
      <Card><Muted>This week</Muted>
        <div style={{ display: "flex", alignItems: "flex-end", height: 110, gap: 8, marginTop: 10 }}>
          {week.map(d => { const r = rate(d); return <div key={iso(d)} style={{ flex: 1, textAlign: "center" }}><div style={{ height: Math.max((r || 0) * 90, 4), background: r ? T.acc : "#2A2A33", borderRadius: 6 }} /><Muted style={{ fontSize: 12, marginTop: 6 }}>{DAY[d.getDay()][0]}</Muted></div>; })}
        </div></Card>
      <Card><Muted>Discipline Score · last {span} days</Muted><svg viewBox="0 0 300 90" width="100%" height="90" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={T.acc} strokeWidth="3" strokeLinejoin="round" /></svg></Card>
      <div style={{ display: "flex", gap: 10 }}>
        <Card style={{ flex: 1 }}><Muted style={{ fontSize: 13 }}>Best day</Muted><div style={{ color: T.acc, fontSize: 20, fontWeight: 800 }}>{avg[0] ? DAY[avg[0][0]] : "—"}</div></Card>
        <Card style={{ flex: 1 }}><Muted style={{ fontSize: 13 }}>Worst day</Muted><div style={{ color: T.miss, fontSize: 20, fontWeight: 800 }}>{avg.length ? DAY[avg[avg.length - 1][0]] : "—"}</div></Card>
      </div>
      {s.premium ? <Card><Muted style={{ fontSize: 13 }}>Pattern</Muted><div style={{ fontWeight: 700 }}>{top ? `${top[0]} is your top reason (${top[1]} of ${s.reasons.length} misses).` : "Log a few misses and patterns show up here."}</div></Card>
        : <Card onClick={() => set({ screen: "paywall" })} style={{ textAlign: "center" }}><b>🔒 Full history + pattern cards</b><Muted style={{ fontSize: 13 }}>Free shows the last 7 days.</Muted></Card>}
    </Col>);
}
function Coach({ s, set }) {
  const [msgs, setMsgs] = useState([{ r: "ai", t: "I've got your habits. What's getting in your way?" }]);
  const [txt, setTxt] = useState("");
  if (!s.premium) return (
    <Col style={{ alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>🔒</div><H1>Unlock your AI Coach</H1><Btn style={{ width: "auto", padding: "16px 32px" }} onClick={() => set({ screen: "paywall" })}>See Premium</Btn>
    </Col>);
  // Stand-in reply. Replace with a fetch() to your backend that calls the LLM with `s.habits`, streaks and miss reasons.
  const reply = q => {
    const worst = s.habits.map(h => ({ h, n: streak(s, h) })).sort((a, b) => a.n - b.n)[0];
    if (/plan/i.test(q)) return `This week: do ${s.habits.map(h => h.name).join(", ")} before noon. Same time daily. Start with ${worst?.h.name ?? "your easiest habit"}.`;
    if (/missed|why/i.test(q)) return s.reasons.length ? `Your misses: ${s.reasons.slice(-3).map(r => r.reason).join(", ")}. Pick the smallest version of ${worst?.h.name} and do it first thing.` : "No misses logged yet. If you slipped, tell me which habit and what got in the way.";
    return `Motivation is unreliable. Do the 2-minute version of ${worst?.h.name ?? "one habit"} right now, then tell me how it felt.`;
  };
  const send = q => { if (!q.trim()) return; setMsgs(m => [...m, { r: "me", t: q }, { r: "ai", t: reply(q) }]); setTxt(""); };
  return (
    <Col>
      <H1>Coach</H1>
      {msgs.map((m, i) => <div key={i} style={{ alignSelf: m.r === "me" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.r === "me" ? T.acc : T.card, color: m.r === "me" ? T.bg : T.text, borderRadius: 16, padding: 14, fontWeight: 500 }}>{m.t}</div>)}
      {msgs.length === 1 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{["Why did I miss yesterday?", "Plan my week", "I'm unmotivated"].map(c => <button key={c} style={chip(false)} onClick={() => send(c)}>{c}</button>)}</div>}
      <div style={{ display: "flex", gap: 10 }}><input style={input} value={txt} placeholder="Message your coach" onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === "Enter" && send(txt)} /><Btn style={{ width: "auto", padding: "0 20px" }} onClick={() => send(txt)}>Send</Btn></div>
    </Col>);
}
function Settings({ s, set, onManage, manageBusy, manageError, isSignedIn, userEmail, onSignOut }) {
  const row = (label, f, danger) => <div onClick={f} style={{ padding: "14px 0", fontWeight: 600, cursor: "pointer", color: danger ? T.miss : T.text }}>{label}</div>;
  // Demo helper: backdates habits and leaves yesterday empty so Comeback Mode triggers on Today.
  const demo = () => set(x => {
    const checks = [];
    x.habits.forEach(h => [2, 3, 4, 5, 6].forEach(n => { const d = add(new Date(), -n); if (sched(h, d)) checks.push({ h: h.id, date: iso(d), type: "normal" }); }));
    return { habits: x.habits.map(h => ({ ...h, created: add(new Date(), -10).toISOString() })), checks, reasons: [], tab: "today" };
  });
  return (
    <Col>
      <H1>Settings</H1>
      <Card><b>Profile</b><Muted>{userEmail || "Not signed in"}</Muted><Muted>{s.premium ? "Stakes Premium" : "Free plan"}</Muted></Card>
      <Card><b>Reminders</b><input type="time" value={s.time} onChange={e => set({ time: e.target.value })} style={{ ...input, marginTop: 10 }} /></Card>
      <Card>
        {row(s.premium ? "Manage Subscription" : "Go Premium", () => (s.premium ? onManage() : set({ screen: "paywall" })))}
        {manageBusy && <Muted>Opening billing portal…</Muted>}
        {manageError && <Muted style={{ color: T.miss }}>{manageError}</Muted>}
        {isSignedIn && row("Sign out", onSignOut)}
        {row("Notifications", () => { try { Notification.requestPermission(); } catch {} })}
        {row("Demo: simulate a missed day", demo)}
        {row("Delete Account", () => confirm("Delete all data?") && (localStorage.removeItem(KEY), location.reload()), true)}
      </Card>
    </Col>);
}

/* ---------- app shell ---------- */
export default function App() {
  const [s, set] = useStakes();
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [billingReady, setBillingReady] = useState(false);
  const isApp = s.screen === "app";

  useEffect(() => {
    let active = true;
    async function refreshBilling() {
      if (!isLoaded) return;
      if (!isSignedIn) {
        set({ premium: false });
        setBillingError("");
        setBillingReady(true);
        return;
      }
      setBillingReady(false);
      setBillingError("");
      try {
        const token = await getToken();
        const query = new URLSearchParams(window.location.search);
        const subscriptionId = query.get("subscription_id");
        if (query.get("checkout") === "success" && subscriptionId) {
          const verified = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId }),
          });
          if (!verified.ok) throw new Error((await verified.json()).error || "Could not verify the subscription.");
        }
        const response = await fetch("/api/billing/status", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error((await response.json()).error || "Could not load subscription status.");
        const data = await response.json();
        if (!active) return;
        set({ premium: data.premium });
        if (query.has("checkout")) window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        if (active) {
          set({ premium: false });
          setBillingError(error.message || "Could not load subscription status.");
        }
      } finally {
        if (active) setBillingReady(true);
      }
    }
    refreshBilling();
    return () => { active = false; };
  }, [isLoaded, isSignedIn, getToken]);

  async function billingAction(path, body) {
    const token = await getToken();
    const response = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Billing request failed.");
    if (!data.url) throw new Error("The billing service did not return a checkout URL.");
    window.location.assign(data.url);
  }
  const startCheckout = async () => {
    setCheckoutBusy(true);
    setCheckoutError("");
    try { await billingAction("/api/billing/checkout"); }
    catch (error) { setCheckoutError(error.message); setCheckoutBusy(false); }
  };
  const manageSubscription = async () => {
    setManageBusy(true);
    setManageError("");
    try { await billingAction("/api/billing/portal"); }
    catch (error) { setManageError(error.message); setManageBusy(false); }
  };
  const signOutUser = async () => {
    await signOut();
    set({ screen: "welcome", premium: false });
  };
  if (s.screen === "paywall") return <div className="app-shell"><div className="app-frame app-frame-flow"><div className="flow-body"><Paywall set={set} onCheckout={startCheckout} checkoutBusy={checkoutBusy} checkoutError={checkoutError} /></div></div></div>;
  if (!isApp) return <div className="app-shell"><div className="app-frame app-frame-flow"><div className="flow-body">{s.screen === "welcome" ? <Welcome set={set} /> : <Onboarding s={s} set={set} />}</div></div></div>;

  const v = s.view;
  const page = v?.t === "habit" ? <HabitDetail s={s} set={set} id={v.id} /> : v?.t === "newHabit" ? <NewHabit s={s} set={set} /> : v?.t === "newGoal" ? <NewGoal s={s} set={set} />
    : { today: <Today s={s} set={set} />, goals: <Goals s={s} set={set} />, insights: <Insights s={s} set={set} />, coach: <Coach s={s} set={set} />, settings: <Settings s={s} set={set} onManage={manageSubscription} manageBusy={manageBusy} manageError={manageError} isSignedIn={isSignedIn} userEmail={user?.primaryEmailAddress?.emailAddress} onSignOut={signOutUser} /> }[s.tab];
  const tabs = [["today", "✓", "Today"], ["goals", "⚑", "Goals"], ["insights", "▥", "Insights"], ["coach", "💬", "Coach"], ["settings", "⚙", "Settings"]];
  return (
    <div className="app-shell"><div className="app-frame app-frame-dashboard">
      <div className="app-body">{page}{billingReady && billingError && <Muted style={{ color: T.miss, marginTop: 16 }}>Subscription status is unavailable: {billingError}</Muted>}</div>
      <nav className="app-nav" aria-label="Main navigation">
        <div className="nav-brand"><Logo size={36} /><span>STAKES</span></div>
        {tabs.map(([k, i, l]) => <button key={k} className="app-nav-button" aria-label={l} aria-current={s.tab === k ? "page" : undefined} onClick={() => set({ tab: k, view: null })} style={{ color: s.tab === k ? T.acc : T.muted }}><span className="app-nav-icon">{i}</span><span>{l}</span></button>)}
      </nav>
    </div></div>
  );
}
