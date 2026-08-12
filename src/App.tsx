import { useEffect, useMemo, useState } from 'react'

type Clima = 'soleado' | 'nublado' | 'lluvia' | 'tormenta'
type Step = 1 | 2 | 3
type Estacion = { nombre: string; zona?: string }

const STATIONS: Estacion[] = [
  { nombre: 'Federico Lacroze', zona: 'Colegiales' },
  { nombre: 'Artigas' },
  { nombre: 'Arata' },
  { nombre: 'Francisco Beiró' },
  { nombre: 'El Libertador' },
  { nombre: 'Devoto' },
  { nombre: 'Lynch' },
  { nombre: 'Fernández Moreno' },
  { nombre: 'Lourdes' },
  { nombre: 'Tropezón' },
  { nombre: 'J.M. Bosch' },
  { nombre: 'Martín Coronado' },
  { nombre: 'Pablo Podestá' },
  { nombre: 'Jorge Newbery' },
  { nombre: 'Rubén Darío' },
  { nombre: 'Ejército de los Andes' },
  { nombre: 'Lasalle' },
  { nombre: 'Sargento Barrufaldi' },
  { nombre: 'Capitán Lozano' },
  { nombre: 'Teniente Agneta' },
  { nombre: 'Campo de Mayo' },
  { nombre: 'Sargento Cabral' },
  { nombre: 'General Lemos', zona: 'San Miguel' },
]

const LACROZE = 0
const LEMOS = STATIONS.length - 1

/**
 * Minutos de viaje entre estaciones consecutivas, del horario oficial de Metrovías
 * ("Horarios Urquiza invierno 2026", vigencia 2/3/2026). El índice i es el tramo de
 * STATIONS[i] a STATIONS[i+1], en los dos arrays.
 *
 * Salieron de la moda sobre 375 trenes del PDF oficial. Dos cosas que la versión
 * anterior no modelaba y acá sí:
 *   1. Los tramos NO son equidistantes: van de 1 min (Jorge Newbery–Rubén Darío)
 *      a 5 min (Lacroze–Artigas en sentido Lacroze). Antes se prorrateaban 48/22.
 *   2. NO son simétricos: punta a punta son 48 min hacia Lemos y 50 hacia Lacroze.
 *
 * El día de la semana es indistinto: sentido Lacroze los tramos son idénticos hábil,
 * sábado y domingo, y sentido Lemos solo cambia 1 min en Lasalle–Barrufaldi (3 hábil,
 * 2 fin de semana). Se usan los de día hábil, que dan los 48 min punta a punta.
 */
const TRAMOS_A_LEMOS = [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 1, 4, 1, 3, 2, 2, 2, 2, 3]
const TRAMOS_A_LACROZE = [5, 2, 3, 1, 1, 2, 2, 2, 2, 2, 3, 3, 2, 2, 4, 2, 3, 2, 2, 1, 2, 2]

/** Minutos de viaje entre dos estaciones cualesquiera, en el sentido que implica el par. */
function minutosEntre(desde: number, hasta: number): number {
  const tramos = hasta > desde ? TRAMOS_A_LEMOS : TRAMOS_A_LACROZE
  const lo = Math.min(desde, hasta)
  const hi = Math.max(desde, hasta)
  let total = 0
  for (let i = lo; i < hi; i++) total += tramos[i]
  return total
}

const CARET = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

function StationButton({
  id,
  estacion,
  onClick,
}: {
  id: string
  estacion: Estacion
  onClick: () => void
}) {
  return (
    <button id={id} className="station-btn" onClick={onClick}>
      <span className="station-dot" />
      <span className="flex-1 text-left">
        <span className="block text-2xl leading-tight font-semibold">{estacion.nombre}</span>
        {estacion.zona && <span className="block text-sm text-muted-foreground">{estacion.zona}</span>}
      </span>
      <span className="text-xl text-muted-foreground">›</span>
    </button>
  )
}

/** El select nativo va escondido sobre el label: en mobile abre el picker del sistema. */
function OtraEstacion({
  id,
  onPick,
  deshabilitada,
}: {
  id: string
  onPick: (i: number) => void
  deshabilitada?: number
}) {
  return (
    <label htmlFor={id} className="station-btn station-btn--ghost relative mt-1">
      <span className="flex-1 text-left text-lg font-medium text-muted-foreground">Otra estación…</span>
      <span className="ghost-caret">{CARET}</span>
      <select
        id={id}
        className="absolute inset-0 h-full w-full opacity-0"
        value=""
        onChange={(e) => onPick(Number(e.target.value))}
      >
        <option value="" disabled>
          Otra estación…
        </option>
        {STATIONS.map((e, i) => (
          <option key={e.nombre} value={i} disabled={i === deshabilitada}>
            {e.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

function Scene({
  clima,
  onClima,
  dir,
  detenido,
}: {
  clima: Clima
  onClima: (c: Clima) => void
  dir: number
  detenido: boolean
}) {
  const clases = ['scene', `scene--${clima}`]
  if (dir === -1) clases.push('scene--rev')
  if (detenido) clases.push('scene--stop')
  return (
    <div className={clases.join(' ')}>
      <select
        id="sel-clima"
        className="scene-clima"
        value={clima}
        onChange={(e) => onClima(e.target.value as Clima)}
        aria-label="Clima"
      >
        <option value="soleado">☀️ Soleado</option>
        <option value="nublado">☁️ Nublado</option>
        <option value="lluvia">🌧️ Lluvia</option>
        <option value="tormenta">⛈️ Tormenta</option>
      </select>
      <span className="scene-sol">☀️</span>
      <div className="scene-nubes" />
      <div className="scene-edificios" />
      <div className="scene-postes" />
      <span className="scene-tren">🚃🚃🚃</span>
      <div className="scene-rail" />
      <div className="scene-lluvia" />
      <span className="scene-rayo scene-rayo--1">⚡</span>
      <span className="scene-rayo scene-rayo--2">⚡</span>
    </div>
  )
}

export default function App() {
  const [step, setStep] = useState<Step>(1)
  const [origin, setOrigin] = useState<number | null>(null)
  const [dest, setDest] = useState<number | null>(null)
  const [clima, setClima] = useState<Clima>('soleado')
  const [viaje, setViaje] = useState<{ t0: number; etaTs: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // El reloj solo corre en el paso 3: es el único que muestra el contador.
  useEffect(() => {
    if (step !== 3) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [step])

  const o = origin ?? 0
  const dir = origin !== null && dest !== null ? (dest > origin ? 1 : -1) : 0

  function elegirOrigen(i: number) {
    setOrigin(i)
    setStep(2)
  }

  function elegirDestino(i: number) {
    if (origin === null) return
    const t0 = Date.now()
    setDest(i)
    setViaje({ t0, etaTs: t0 + minutosEntre(origin, i) * 60000 })
    setNow(t0)
    setStep(3)
  }

  function reset() {
    setStep(1)
    setOrigin(null)
    setDest(null)
    setViaje(null)
  }

  const restanteMs = viaje ? Math.max(0, viaje.etaTs - now) : 0
  const llegue = viaje !== null && restanteMs === 0
  const restanteMin = Math.floor(restanteMs / 60000)
  const restanteSeg = String(Math.floor(restanteMs / 1000) % 60).padStart(2, '0')
  const etaTxt = viaje
    ? new Date(viaje.etaTs).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : ''
  const progreso = viaje
    ? Math.min(100, Math.round(((now - viaje.t0) / (viaje.etaTs - viaje.t0)) * 100))
    : 0
  const duracionMin = origin !== null && dest !== null ? minutosEntre(origin, dest) : 0

  const ruta = useMemo(() => {
    if (origin === null || dest === null || dir === 0) return []
    const r: number[] = []
    for (let i = origin; i !== dest; i += dir) r.push(i)
    r.push(dest)
    return r
  }, [origin, dest, dir])

  /** Posición de la estación i sobre la barra, en % del viaje total. */
  const pct = (i: number) => (duracionMin === 0 ? 0 : (minutosEntre(o, i) / duracionMin) * 100)

  const prevIdx = ruta.reduce((p, i) => (pct(i) <= progreso ? i : p), o)
  const nextIdx = ruta.find((i) => pct(i) > progreso) ?? null

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="relative space-y-2 text-center">
        {step > 1 && (
          <button
            id="btn-back"
            className="btn absolute top-0 left-0 z-10 size-14 rounded-full bg-secondary text-3xl text-secondary-foreground"
            onClick={() => setStep((s) => (s - 1) as Step)}
            aria-label="Volver"
          >
            ←
          </button>
        )}
        <h1 className="sign text-xl">🚆 TREN URQUIZA</h1>
        <div className="chevron mx-auto max-w-[10rem]" />
        {step < 3 && <p className="text-sm text-muted-foreground">¿Cuánto falta para llegar?</p>}
      </header>

      {step === 1 && (
        <section className="flex flex-1 flex-col justify-center gap-3 pt-16">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            ¿En qué <span className="hl">estación</span>
            <br />
            estás?
          </h2>
          <div className="flex min-h-[16.5rem] flex-col gap-3">
            <StationButton
              id="btn-origen-lacroze"
              estacion={STATIONS[LACROZE]}
              onClick={() => elegirOrigen(LACROZE)}
            />
            <StationButton
              id="btn-origen-lemos"
              estacion={STATIONS[LEMOS]}
              onClick={() => elegirOrigen(LEMOS)}
            />
            <OtraEstacion id="sel-origen" onPick={elegirOrigen} />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-1 flex-col justify-center gap-3 pt-16">
          <p className="text-center text-sm text-muted-foreground">
            Estás en <strong className="text-foreground">{STATIONS[o].nombre}</strong>
          </p>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
            ¿Dónde <span className="hl">te bajás</span>?
          </h2>
          <div className="flex min-h-[16.5rem] flex-col gap-3">
            {o !== LEMOS && (
              <StationButton
                id="btn-dest-lemos"
                estacion={STATIONS[LEMOS]}
                onClick={() => elegirDestino(LEMOS)}
              />
            )}
            {o !== LACROZE && (
              <StationButton
                id="btn-dest-lacroze"
                estacion={STATIONS[LACROZE]}
                onClick={() => elegirDestino(LACROZE)}
              />
            )}
            <OtraEstacion id="sel-destino" onPick={elegirDestino} deshabilitada={o} />
          </div>
        </section>
      )}

      {step === 3 && dest !== null && (
        <section className="flex flex-1 flex-col gap-5">
          <p className="flex items-center justify-center gap-2 text-center text-base text-muted-foreground">
            <span>{STATIONS[o].nombre}</span> →{' '}
            <span className="sign text-sm uppercase">{STATIONS[dest].nombre}</span>
          </p>

          <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card text-center shadow-sm">
            <Scene clima={clima} onClima={setClima} dir={dir} detenido={llegue} />
            {llegue ? (
              <div className="scene-content pop flex flex-1 flex-col justify-center gap-2 px-6 pt-8 pb-28">
                <p className="text-5xl">🎉</p>
                <p className="text-2xl font-bold">Llegaste a {STATIONS[dest].nombre}</p>
              </div>
            ) : (
              <div className="scene-content flex flex-1 flex-col justify-center gap-1 px-6 pt-8 pb-28">
                <p className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span className="crossing">
                    <i />
                    <i />
                  </span>{' '}
                  llegás a las
                </p>
                <p className="text-7xl font-bold tracking-tight tabular-nums">{etaTxt}</p>
                <p className="mt-2 text-lg text-muted-foreground">
                  faltan{' '}
                  <strong className="text-foreground tabular-nums">
                    {restanteMin}:{restanteSeg}
                  </strong>{' '}
                  min
                </p>
              </div>
            )}
          </div>

          {!llegue && (
            <div className="px-1">
              <div className="relative mb-1 h-4 text-xs">
                <span
                  className="absolute whitespace-nowrap text-muted-foreground transition-all duration-1000"
                  style={{ left: `${pct(prevIdx)}%`, transform: `translateX(-${pct(prevIdx)}%)` }}
                >
                  <span className="text-[0.625rem] tracking-wider uppercase opacity-70">
                    {progreso - pct(prevIdx) < 2 ? 'Estás en' : 'Pasaste'}
                  </span>{' '}
                  <span>{STATIONS[prevIdx].nombre}</span>
                </span>
              </div>
              <div className="relative h-6">
                <div className="absolute inset-x-0 bottom-1.5 h-2.5 rounded-full bg-rail" />
                {ruta.map((i) => (
                  <span
                    key={i}
                    className={`absolute bottom-[0.6875rem] -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-sm ${
                      i === o || i === dest
                        ? 'h-3 w-3 ring-2 ring-white ring-offset-1 ring-offset-rail'
                        : 'h-2 w-2'
                    }`}
                    style={{ left: `${pct(i)}%`, opacity: pct(i) <= progreso ? 1 : 0.5 }}
                  />
                ))}
                <span
                  className="absolute bottom-1 -translate-x-1/2 text-lg transition-all duration-1000"
                  style={{ left: `${progreso}%` }}
                >
                  🚃
                </span>
              </div>
              <div className="relative mt-1 h-4 text-xs">
                {nextIdx !== null && (
                  <span
                    className="absolute font-semibold whitespace-nowrap transition-all duration-1000"
                    style={{ left: `${pct(nextIdx)}%`, transform: `translateX(-${pct(nextIdx)}%)` }}
                  >
                    <span className="text-[0.625rem] font-normal tracking-wider text-muted-foreground uppercase">
                      {nextIdx === dest ? 'Bajás en' : 'Próxima'}
                    </span>{' '}
                    <span>{STATIONS[nextIdx].nombre} →</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            id="btn-reset"
            className="btn mt-auto h-16 w-full rounded-2xl border border-border text-xl"
            onClick={reset}
          >
            ↺ Nuevo viaje
          </button>
        </section>
      )}

      {step === 3 && (
        <p className="text-center text-xs text-muted-foreground">
          {duracionMin} min según el horario oficial de Metrovías.
        </p>
      )}
    </main>
  )
}
