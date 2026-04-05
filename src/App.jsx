import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ttdeucqqjnbnlscoylzw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZGV1Y3Fxam5ibmxzY295bHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjA3ODgsImV4cCI6MjA5MDk5Njc4OH0.kRYxi39JC6HQhenr4tAL0Q6RxVY7pluwtj3AcmCJWw4";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MES_ACTUAL = new Date().getMonth();
const ANIO_ACTUAL = new Date().getFullYear();

function fARS(n) {
  if (!n && n !== 0) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n/1000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}
function fUSD(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

const CATS_GASTO = [
  "Alquiler/Hipoteca","Servicios","Transporte","Salud",
  "Gimnasio","Salidas","Ropa","Suscripciones","Casa (mi parte)","Otros"
];

const INSTRUMENTOS = [
  { id: "acciones_ar", label: "Acciones AR", emoji: "🇦🇷", color: "#5a7a9a" },
  { id: "cedears",     label: "CEDEARs",     emoji: "🌎",  color: "#c8a96e" },
  { id: "bonos",       label: "Bonos",       emoji: "📄",  color: "#7a9a5a" },
  { id: "fci",         label: "FCI",         emoji: "🏦",  color: "#9a5a7a" },
  { id: "crypto",      label: "Crypto",      emoji: "₿",   color: "#8a7a4a" },
];

const inputStyle = {
  background: "#0e0e0e", border: "1px solid #252525", color: "#e0d8c8",
  padding: "10px 12px", borderRadius: 4, fontFamily: "'Courier New', monospace",
  fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
};
const cardStyle = {
  background: "#141414", border: "1px solid #1e1e1e", borderRadius: 6, padding: 16, marginBottom: 12,
};
const labelStyle = {
  fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase",
  fontFamily: "monospace", display: "block", marginBottom: 6,
};

const CARTERA_INICIAL = { acciones_ar: 2800000, cedears: 5600000, bonos: 2100000, fci: 1400000, crypto: 2100000 };

export default function KaizenFinanzas() {
  const [tab, setTab] = useState("dashboard");
  const [mes, setMes] = useState(MES_ACTUAL);
  const [anio] = useState(ANIO_ACTUAL);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Config
  const [tc, setTc] = useState(1300);
  const [metaUSD, setMetaUSD] = useState(30000);

  // Ingresos
  const [ingresoFijo, setIngresoFijo] = useState("4500000");
  const [ingresoVariable, setIngresoVariable] = useState("");

  // Gastos
  const [gastos, setGastos] = useState([]);
  const [formGasto, setFormGasto] = useState({ categoria: CATS_GASTO[0], descripcion: "", monto: "", tipo: "fijo" });

  // Cartera
  const [cartera, setCartera] = useState(CARTERA_INICIAL);

  // Historial
  const [historial, setHistorial] = useState([]);

  // ── Cargar datos ──────────────────────────────────────────────────────────
  useEffect(() => { cargarTodo(); }, [mes, anio]);

  async function cargarTodo() {
    setLoading(true);
    try {
      const [{ data: g }, { data: ing }, { data: cart }, { data: conf }, { data: hist }] = await Promise.all([
        supabase.from("gastos").select("*").eq("mes", mes).eq("anio", anio).order("created_at", { ascending: false }),
        supabase.from("ingresos").select("*").eq("mes", mes).eq("anio", anio).single(),
        supabase.from("cartera").select("*").eq("mes", mes).eq("anio", anio).single(),
        supabase.from("configuracion").select("*"),
        supabase.from("historial").select("*").order("anio").order("mes"),
      ]);

      setGastos(g || []);

      if (ing) {
        setIngresoFijo(ing.fijo.toString());
        setIngresoVariable(ing.variable.toString());
      } else {
        setIngresoFijo("4500000");
        setIngresoVariable("");
      }

      if (cart) {
        setCartera({
          acciones_ar: cart.acciones_ar || 0,
          cedears: cart.cedears || 0,
          bonos: cart.bonos || 0,
          fci: cart.fci || 0,
          crypto: cart.crypto || 0,
        });
      } else {
        setCartera(CARTERA_INICIAL);
      }

      if (conf) {
        const tcRow = conf.find(c => c.clave === "tipo_cambio");
        const metaRow = conf.find(c => c.clave === "meta_usd");
        if (tcRow) setTc(parseFloat(tcRow.valor));
        if (metaRow) setMetaUSD(parseFloat(metaRow.valor));
      }

      setHistorial(hist || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // ── Guardar ingresos ──────────────────────────────────────────────────────
  async function guardarIngresos() {
    await supabase.from("ingresos").upsert({
      mes, anio,
      fijo: parseFloat(ingresoFijo) || 0,
      variable: parseFloat(ingresoVariable) || 0,
    }, { onConflict: "mes,anio" });
  }

  // ── Guardar cartera ───────────────────────────────────────────────────────
  async function guardarCartera(nuevaCartera) {
    await supabase.from("cartera").upsert({ mes, anio, ...nuevaCartera }, { onConflict: "mes,anio" });
  }

  // ── Guardar config ────────────────────────────────────────────────────────
  async function guardarConfig(clave, valor) {
    await supabase.from("configuracion").upsert({ clave, valor: valor.toString() }, { onConflict: "clave" });
  }

  // ── Agregar gasto ─────────────────────────────────────────────────────────
  async function addGasto() {
    if (!formGasto.descripcion || !formGasto.monto) return;
    setGuardando(true);
    const nuevo = { mes, anio, ...formGasto, monto: parseFloat(formGasto.monto) };
    const { data, error } = await supabase.from("gastos").insert([nuevo]).select().single();
    if (!error && data) {
      setGastos([data, ...gastos]);
      setFormGasto({ ...formGasto, descripcion: "", monto: "" });
    }
    setGuardando(false);
  }

  async function removeGasto(id) {
    await supabase.from("gastos").delete().eq("id", id);
    setGastos(gastos.filter(g => g.id !== id));
  }

  // ── Cerrar mes ────────────────────────────────────────────────────────────
  async function cerrarMes() {
    if (!totalIngresos) return;
    const row = { mes, anio, ingresos: totalIngresos, gastos: totalGastos, excedente, cartera_usd: Math.round(totalCarteraUSD) };
    const { error } = await supabase.from("historial").upsert(row, { onConflict: "mes,anio" });
    if (!error) {
      await cargarTodo();
      alert(`✅ ${MESES_FULL[mes]} cerrado y guardado.`);
    }
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const totalIngresos = (parseFloat(ingresoFijo) || 0) + (parseFloat(ingresoVariable) || 0);
  const totalGastos   = gastos.reduce((a, g) => a + Number(g.monto), 0);
  const excedente     = totalIngresos - totalGastos;
  const pctAhorro     = totalIngresos > 0 ? Math.round(excedente / totalIngresos * 100) : 0;

  const totalCarteraARS = INSTRUMENTOS.reduce((a, i) => a + (Number(cartera[i.id]) || 0), 0);
  const totalCarteraUSD = totalCarteraARS / tc;
  const pctMeta         = Math.min(100, Math.round(totalCarteraUSD / metaUSD * 100));
  const faltaUSD        = Math.max(0, metaUSD - totalCarteraUSD);
  const excedenteMensualUSD = Math.max(0, excedente / tc);

  const proyeccion = useMemo(() => {
    let acc = totalCarteraUSD;
    return Array.from({ length: 12 }, (_, i) => {
      acc += excedenteMensualUSD;
      return { mes: MESES[(MES_ACTUAL + i + 1) % 12], usd: Math.round(acc) };
    });
  }, [totalCarteraUSD, excedenteMensualUSD]);

  const mesAlcanzaMeta = proyeccion.findIndex(p => p.usd >= metaUSD);

  const diagnostico = useMemo(() => {
    const items = [];
    if (excedente <= 0)
      items.push({ tipo: "critico", msg: "Sin excedente para invertir. Revisá tus gastos urgente." });
    else if (pctAhorro < 30)
      items.push({ tipo: "alerta", msg: `Ahorrás el ${pctAhorro}%. Para la meta necesitás al menos 40-50%.` });
    else
      items.push({ tipo: "ok", msg: `Ahorrás el ${pctAhorro}% — ${fARS(excedente)}/mes. Buen ritmo.` });

    if (excedenteMensualUSD > 0) {
      const mesesParaMeta = Math.ceil(faltaUSD / excedenteMensualUSD);
      if (mesesParaMeta <= 12)
        items.push({ tipo: "ok", msg: `Con el excedente actual alcanzás la meta en ~${mesesParaMeta} meses (sin rendimiento).` });
      else
        items.push({ tipo: "alerta", msg: `Tardarías ~${mesesParaMeta} meses solo con aportes. Necesitás optimizar o aumentar ingresos.` });
    }

    if (totalCarteraUSD > 0)
      items.push({ tipo: "ok", msg: `Tu cartera vale ${fUSD(totalCarteraUSD)} — ${pctMeta}% de la meta de ${fUSD(metaUSD)}.` });

    const cedears = Number(cartera["cedears"]) || 0;
    if (totalCarteraARS > 0 && cedears / totalCarteraARS < 0.3)
      items.push({ tipo: "alerta", msg: "Menos del 30% en CEDEARs. Aumentar exposición en USD puede acelerar la meta." });

    return items;
  }, [pctAhorro, excedente, excedenteMensualUSD, faltaUSD, totalCarteraUSD, pctMeta, cartera, totalCarteraARS, metaUSD]);

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "ingresos",  label: "💰 Ingresos"  },
    { id: "gastos",    label: "💸 Gastos"    },
    { id: "cartera",   label: "📈 Cartera"   },
    { id: "meta",      label: "🎯 Meta USD"  },
    { id: "kaizen",    label: "🟢 Kaizen"    },
  ];

  return (
    <div style={{ fontFamily: "'Georgia','Times New Roman',serif", background: "#0a0a0a", minHeight: "100vh", color: "#e0d8c8" }}>

      {/* HEADER */}
      <div style={{ background: "#111", borderBottom: "1px solid #1c1c1c", padding: "20px 20px 0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 4, color: "#5a4a30", textTransform: "uppercase", marginBottom: 2 }}>Método Kaizen</div>
              <h1 style={{ margin: 0, fontSize: 22, fontStyle: "italic", color: "#c8a96e" }}>Finanzas Personales</h1>
              <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: "monospace", marginTop: 2 }}>Meta: {fUSD(metaUSD)} en cartera · {anio}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>TC $</span>
                <input type="number" value={tc}
                  onChange={e => setTc(parseFloat(e.target.value) || 1300)}
                  onBlur={e => guardarConfig("tipo_cambio", e.target.value)}
                  style={{ ...inputStyle, width: 85, padding: "5px 8px", fontSize: 12 }} />
                <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>/USD</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>Meta</span>
                <input type="number" value={metaUSD}
                  onChange={e => setMetaUSD(parseFloat(e.target.value) || 30000)}
                  onBlur={e => guardarConfig("meta_usd", e.target.value)}
                  style={{ ...inputStyle, width: 85, padding: "5px 8px", fontSize: 12 }} />
                <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>USD</span>
              </div>
            </div>
          </div>

          {/* Barra meta */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>META {fUSD(metaUSD)}</span>
              <span style={{ fontSize: 10, color: "#c8a96e", fontFamily: "monospace" }}>{fUSD(totalCarteraUSD)} · {pctMeta}%</span>
            </div>
            <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${pctMeta}%`, background: "linear-gradient(90deg,#5a7a3a,#c8a96e)", borderRadius: 2, transition: "width 0.6s" }} />
            </div>
          </div>

          {/* Selector mes */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  background: tab === t.id ? "#c8a96e" : "transparent",
                  color: tab === t.id ? "#0a0a0a" : "#555",
                  border: "none", padding: "9px 12px", fontSize: 11,
                  cursor: "pointer", borderRadius: "4px 4px 0 0",
                  fontFamily: "monospace", whiteSpace: "nowrap", transition: "all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>
            <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
              style={{ ...inputStyle, width: "auto", padding: "5px 8px", fontSize: 11 }}>
              {MESES_FULL.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px" }}>
        {loading && <div style={{ textAlign: "center", color: "#444", fontFamily: "monospace", fontSize: 12, padding: "20px 0" }}>⟳ Cargando...</div>}

        {/* DASHBOARD */}
        {!loading && tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Ingresos",  val: fARS(totalIngresos), color: "#4a8a5a" },
                { label: "Gastos",    val: fARS(totalGastos),   color: "#8a4a4a" },
                { label: "Excedente", val: fARS(excedente),     color: excedente >= 0 ? "#c8a96e" : "#e07070" },
              ].map(k => (
                <div key={k.label} style={{ ...cardStyle, borderLeft: `3px solid ${k.color}`, textAlign: "center", padding: 14 }}>
                  <div style={labelStyle}>{k.label}</div>
                  <div style={{ fontSize: 18, color: k.color, fontFamily: "monospace", fontWeight: "bold" }}>{k.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ ...cardStyle, borderLeft: "3px solid #c8a96e" }}>
                <div style={labelStyle}>Cartera total</div>
                <div style={{ fontSize: 22, color: "#c8a96e", fontFamily: "monospace", fontWeight: "bold" }}>{fUSD(totalCarteraUSD)}</div>
                <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace", marginTop: 2 }}>{fARS(totalCarteraARS)}</div>
              </div>
              <div style={{ ...cardStyle, borderLeft: `3px solid ${pctAhorro >= 40 ? "#4a8a5a" : pctAhorro >= 20 ? "#c8a96e" : "#8a4a4a"}` }}>
                <div style={labelStyle}>% Ahorro</div>
                <div style={{ fontSize: 22, color: pctAhorro >= 40 ? "#4a8a5a" : pctAhorro >= 20 ? "#c8a96e" : "#8a4a4a", fontFamily: "monospace", fontWeight: "bold" }}>{pctAhorro}%</div>
                <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace", marginTop: 2 }}>{fARS(excedente)}/mes · {fUSD(excedenteMensualUSD)}</div>
              </div>
            </div>

            {totalIngresos > 0 && (
              <div style={cardStyle}>
                <div style={labelStyle}>Distribución del ingreso</div>
                <div style={{ display: "flex", height: 16, borderRadius: 2, overflow: "hidden", gap: 1, marginBottom: 10 }}>
                  {totalGastos > 0 && <div style={{ flex: Math.min(totalGastos, totalIngresos), background: "#8a4a4a" }} />}
                  {excedente > 0  && <div style={{ flex: excedente, background: "#4a8a5a" }} />}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {[
                    { label: `Gastos ${Math.round(totalGastos/totalIngresos*100)}%`, color: "#8a4a4a" },
                    { label: `Excedente ${pctAhorro}%`, color: "#4a8a5a" },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, background: l.color, borderRadius: 1 }} />
                      <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {historial.length > 0 && (
              <div style={cardStyle}>
                <div style={labelStyle}>Historial mensual</div>
                {historial.map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #161616", fontSize: 12, fontFamily: "monospace", flexWrap: "wrap", gap: 4 }}>
                    <span style={{ color: "#555", minWidth: 30 }}>{MESES[h.mes]}</span>
                    <span style={{ color: "#4a8a5a" }}>+{fARS(h.ingresos)}</span>
                    <span style={{ color: "#8a4a4a" }}>-{fARS(h.gastos)}</span>
                    <span style={{ color: "#c8a96e" }}>{fARS(h.excedente)}</span>
                    <span style={{ color: "#888" }}>{fUSD(h.cartera_usd)}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={cerrarMes} style={{
              width: "100%", background: "#141414", border: "1px solid #c8a96e",
              color: "#c8a96e", padding: 12, borderRadius: 4, cursor: "pointer",
              fontFamily: "monospace", fontSize: 12, letterSpacing: 1,
            }}>↓ Cerrar {MESES_FULL[mes]} y guardar en historial</button>
          </div>
        )}

        {/* INGRESOS */}
        {!loading && tab === "ingresos" && (
          <div>
            <div style={cardStyle}>
              <label style={labelStyle}>Ingreso fijo mensual</label>
              <input type="number" value={ingresoFijo} onChange={e => setIngresoFijo(e.target.value)}
                onBlur={guardarIngresos} placeholder="Ej: 3500000" style={inputStyle} />
              <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", marginTop: 6 }}>≈ {fUSD((parseFloat(ingresoFijo)||0) / tc)}</div>
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>Ingreso variable (comisiones, freelance, extras)</label>
              <input type="number" value={ingresoVariable} onChange={e => setIngresoVariable(e.target.value)}
                onBlur={guardarIngresos} placeholder="Varía entre $0 y $1.5M" style={inputStyle} />
              <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", marginTop: 6 }}>≈ {fUSD((parseFloat(ingresoVariable)||0) / tc)}</div>
            </div>
            <div style={{ ...cardStyle, borderLeft: "3px solid #4a8a5a" }}>
              <div style={labelStyle}>Total ingresos del mes</div>
              <div style={{ fontSize: 28, color: "#4a8a5a", fontFamily: "monospace", fontWeight: "bold" }}>{fARS(totalIngresos)}</div>
              <div style={{ fontSize: 13, color: "#444", fontFamily: "monospace", marginTop: 4 }}>{fUSD(totalIngresos / tc)}</div>
            </div>
            <div style={{ ...cardStyle, background: "#0e0f0e", borderLeft: "3px solid #2a3a2a" }}>
              <p style={{ fontSize: 11, color: "#4a6a4a", fontFamily: "monospace", margin: 0, lineHeight: 1.7 }}>
                💡 Tus ingresos varían entre $4M y $5M. En meses bajos el excedente es ~{fARS(4000000 - totalGastos)}, en meses altos ~{fARS(5000000 - totalGastos)}.
              </p>
            </div>
          </div>
        )}

        {/* GASTOS */}
        {!loading && tab === "gastos" && (
          <div>
            <div style={cardStyle}>
              <div style={labelStyle}>Nuevo gasto personal</div>
              <div style={{ display: "grid", gap: 8 }}>
                <select value={formGasto.categoria} onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })} style={inputStyle}>
                  {CATS_GASTO.map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="text" placeholder="Descripción" value={formGasto.descripcion}
                  onChange={e => setFormGasto({ ...formGasto, descripcion: e.target.value })} style={inputStyle} />
                <input type="number" placeholder="Monto $" value={formGasto.monto}
                  onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addGasto()} style={inputStyle} />
                <div style={{ display: "flex", gap: 6 }}>
                  {["fijo","variable"].map(t => (
                    <button key={t} onClick={() => setFormGasto({ ...formGasto, tipo: t })} style={{
                      flex: 1, padding: 9, border: `1px solid ${formGasto.tipo === t ? "#c8a96e" : "#1e1e1e"}`,
                      background: formGasto.tipo === t ? "#c8a96e18" : "#0e0e0e",
                      color: formGasto.tipo === t ? "#c8a96e" : "#444",
                      borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase",
                    }}>{t === "fijo" ? "💎 Fijo" : "🌊 Variable"}</button>
                  ))}
                </div>
                <button onClick={addGasto} disabled={guardando} style={{
                  background: guardando ? "#555" : "#c8a96e", color: "#0a0a0a", border: "none",
                  padding: 12, borderRadius: 4, cursor: guardando ? "not-allowed" : "pointer",
                  fontFamily: "monospace", fontSize: 13, fontWeight: "bold",
                }}>{guardando ? "Guardando..." : "+ Agregar"}</button>
              </div>
            </div>

            {gastos.length > 0 ? (
              <div style={cardStyle}>
                <div style={labelStyle}>Gastos de {MESES_FULL[mes]}</div>
                {gastos.map(g => (
                  <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #161616" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#c0b8a8" }}>{g.descripcion}</div>
                      <div style={{ fontSize: 10, color: "#3a3a3a", fontFamily: "monospace" }}>{g.categoria} · {g.tipo}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#c8a96e", fontFamily: "monospace", fontSize: 13 }}>{fARS(g.monto)}</span>
                      <button onClick={() => removeGasto(g.id)} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 18 }}>×</button>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: "right", marginTop: 10, fontFamily: "monospace", fontSize: 13 }}>
                  Total: <span style={{ color: "#8a4a4a" }}>{fARS(totalGastos)}</span>
                </div>
              </div>
            ) : (
              <div style={{ ...cardStyle, background: "#0e0e0e", borderLeft: "3px solid #2a2a1a" }}>
                <p style={{ fontSize: 11, color: "#5a5a3a", fontFamily: "monospace", margin: 0, lineHeight: 1.7 }}>
                  💡 Los gastos del hogar (expensas, cochera, super, etc.) van en <strong>Kakebo Casa</strong>. Acá solo tus gastos personales.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CARTERA */}
        {!loading && tab === "cartera" && (
          <div>
            <div style={cardStyle}>
              <div style={labelStyle}>Valor actual de tu cartera en ARS</div>
              <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", marginBottom: 14 }}>Actualizá los montos según el valor de mercado de hoy. Se guarda automáticamente.</div>
              {INSTRUMENTOS.map(inst => {
                const val = Number(cartera[inst.id]) || 0;
                const pct = totalCarteraARS > 0 ? Math.round(val / totalCarteraARS * 100) : 0;
                return (
                  <div key={inst.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{inst.emoji}</span>
                        <span style={{ fontSize: 13, color: "#c0b8a8" }}>{inst.label}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, color: inst.color, fontFamily: "monospace" }}>{fUSD(val / tc)}</span>
                        <span style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}> · {pct}%</span>
                      </div>
                    </div>
                    <input type="number" value={cartera[inst.id] || ""}
                      onChange={e => setCartera({ ...cartera, [inst.id]: e.target.value })}
                      onBlur={() => guardarCartera(cartera)}
                      placeholder="$0" style={{ ...inputStyle, padding: "7px 10px" }} />
                    {val > 0 && (
                      <div style={{ height: 2, background: "#1a1a1a", borderRadius: 1, marginTop: 6 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: inst.color, borderRadius: 1, transition: "width 0.4s" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ ...cardStyle, borderLeft: "3px solid #c8a96e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={labelStyle}>Total cartera</div>
                <div style={{ fontSize: 26, color: "#c8a96e", fontFamily: "monospace", fontWeight: "bold" }}>{fUSD(totalCarteraUSD)}</div>
                <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace" }}>{fARS(totalCarteraARS)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={labelStyle}>Meta {fUSD(metaUSD)}</div>
                <div style={{ fontSize: 26, color: pctMeta >= 50 ? "#4a8a5a" : "#c8a96e", fontFamily: "monospace", fontWeight: "bold" }}>{pctMeta}%</div>
                <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace" }}>Falta {fUSD(faltaUSD)}</div>
              </div>
            </div>
          </div>
        )}

        {/* META */}
        {!loading && tab === "meta" && (
          <div>
            <div style={{ ...cardStyle, textAlign: "center", padding: "28px 20px" }}>
              <div style={labelStyle}>Progreso hacia la meta</div>
              <div style={{ fontSize: 44, color: "#c8a96e", fontFamily: "monospace", fontWeight: "bold" }}>{fUSD(totalCarteraUSD)}</div>
              <div style={{ fontSize: 14, color: "#444", fontFamily: "monospace", marginBottom: 16 }}>de {fUSD(metaUSD)}</div>
              <div style={{ height: 8, background: "#1a1a1a", borderRadius: 4, marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${pctMeta}%`, background: "linear-gradient(90deg,#5a7a3a,#c8a96e)", borderRadius: 4, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 13, color: "#666", fontFamily: "monospace" }}>{pctMeta}% · Falta {fUSD(faltaUSD)}</div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>Proyección 12 meses (sin rendimiento)</div>
              <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", marginBottom: 12 }}>Aportando {fUSD(excedenteMensualUSD)}/mes</div>
              {proyeccion.map((p, i) => {
                const pctP = Math.min(100, Math.round(p.usd / metaUSD * 100));
                const esMeta = i === mesAlcanzaMeta;
                return (
                  <div key={i} style={{ marginBottom: 8, padding: esMeta ? "8px 10px" : "4px 0",
                    background: esMeta ? "#1a2a1a" : "transparent",
                    border: esMeta ? "1px solid #4a8a5a" : "none", borderRadius: esMeta ? 4 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: esMeta ? "#4a8a5a" : "#666", fontFamily: "monospace" }}>
                        {p.mes} {esMeta ? "🎯 META" : ""}
                      </span>
                      <span style={{ fontSize: 12, color: esMeta ? "#4a8a5a" : "#c8a96e", fontFamily: "monospace" }}>{fUSD(p.usd)}</span>
                    </div>
                    <div style={{ height: 2, background: "#1a1a1a", borderRadius: 1 }}>
                      <div style={{ height: "100%", width: `${pctP}%`, background: esMeta ? "#4a8a5a" : "#c8a96e55", borderRadius: 1 }} />
                    </div>
                  </div>
                );
              })}
              {mesAlcanzaMeta === -1 && (
                <div style={{ fontSize: 12, color: "#5a4a3a", fontFamily: "monospace", fontStyle: "italic", marginTop: 8 }}>
                  Con el excedente actual no alcanzás la meta en 12 meses sin rendimiento. Optimizá gastos o aumentá aportes.
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, background: "#0e0f0e", borderLeft: "3px solid #4a7a5a" }}>
              <div style={{ fontSize: 10, color: "#4a7a5a", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>🟢 Próximo paso Kaizen</div>
              <p style={{ fontSize: 13, color: "#5a7a5a", fontStyle: "italic", margin: 0, lineHeight: 1.8 }}>
                {excedenteMensualUSD <= 0
                  ? "Reducí gastos para generar excedente antes de pensar en aportes."
                  : excedenteMensualUSD < faltaUSD / 12
                  ? `Necesitás aportar ${fUSD(Math.ceil(faltaUSD/12))}/mes para llegar en 12 meses. Hoy aportás ${fUSD(excedenteMensualUSD)}.`
                  : `¡Vas bien! Con ${fUSD(excedenteMensualUSD)}/mes y el rendimiento de la cartera, la meta es alcanzable. Revisamos en 30 días.`}
              </p>
            </div>
          </div>
        )}

        {/* KAIZEN */}
        {!loading && tab === "kaizen" && (
          <div>
            <div style={{ ...cardStyle, textAlign: "center", padding: "24px 20px" }}>
              <div style={labelStyle}>Salud financiera personal</div>
              <div style={{ fontSize: 52, fontWeight: "bold", color: pctAhorro >= 40 ? "#4a8a5a" : pctAhorro >= 20 ? "#c8a96e" : "#8a4a4a" }}>
                {pctAhorro >= 40 ? "A" : pctAhorro >= 20 ? "B" : pctAhorro >= 10 ? "C" : "D"}
              </div>
              <div style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>
                {pctAhorro >= 40 ? "Excelente ritmo para la meta"
                  : pctAhorro >= 20 ? "Buen camino, optimizable"
                  : pctAhorro >= 10 ? "Margen bajo, acción necesaria"
                  : "Déficit o ahorro crítico"}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              {diagnostico.map((d, i) => (
                <div key={i} style={{
                  ...cardStyle,
                  borderLeft: `3px solid ${d.tipo === "ok" ? "#4a8a5a" : d.tipo === "alerta" ? "#8a7a3a" : "#8a4a4a"}`,
                  background: d.tipo === "ok" ? "#0e130e" : d.tipo === "alerta" ? "#13110e" : "#130e0e",
                  marginBottom: 8,
                }}>
                  <div style={{ fontSize: 13, color: d.tipo === "ok" ? "#4a8a5a" : d.tipo === "alerta" ? "#c8a96e" : "#e07070", lineHeight: 1.6 }}>
                    {d.tipo === "ok" ? "✓" : d.tipo === "alerta" ? "⚠" : "✕"} {d.msg}
                  </div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>Regla 50/30/20 vs tu realidad</div>
              {[
                { label: "50% Necesidades", ideal: totalIngresos * 0.5, actual: gastos.filter(g=>g.tipo==="fijo").reduce((a,g)=>a+Number(g.monto),0), color: "#5a7a9a" },
                { label: "30% Deseos",      ideal: totalIngresos * 0.3, actual: gastos.filter(g=>g.tipo==="variable").reduce((a,g)=>a+Number(g.monto),0), color: "#9a6a5a" },
                { label: "20% Inversión",   ideal: totalIngresos * 0.2, actual: Math.max(0, excedente), color: "#4a8a5a" },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>{r.label}</span>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: r.actual <= r.ideal ? "#4a8a5a" : "#e07070" }}>
                      {fARS(r.actual)} / {fARS(r.ideal)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${r.ideal > 0 ? Math.min(100, r.actual/r.ideal*100) : 0}%`, background: r.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, background: "#0e0f0e", borderLeft: "3px solid #4a7a5a" }}>
              <div style={{ fontSize: 10, color: "#4a7a5a", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>🎯 Acción del mes</div>
              <p style={{ fontSize: 13, color: "#5a7a5a", fontStyle: "italic", margin: 0, lineHeight: 1.8 }}>
                {excedente <= 0
                  ? "Prioridad: identificar el gasto más grande y reducirlo un 20% este mes."
                  : pctAhorro < 30
                  ? `Excedente actual: ${fARS(excedente)}. Meta: llevar el ahorro al 40% reduciendo gastos variables.`
                  : mesAlcanzaMeta >= 0
                  ? `Proyección: alcanzás ${fUSD(metaUSD)} en ${proyeccion[mesAlcanzaMeta].mes}. Mantené el ritmo y revisá la cartera cada 30 días.`
                  : `Buen excedente, pero no alcanza en 12 meses solo con aportes. Evaluá reinvertir rendimientos y aumentar exposición en CEDEARs.`}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
