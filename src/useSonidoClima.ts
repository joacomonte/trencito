import { useEffect, useRef, useState } from 'react'

/**
 * Sonido de lluvia + truenos, atado al clima de la escena.
 *
 * Los audios se crean recién cuando hace falta (nunca se bajan los ~250 KB si el clima
 * está soleado). El primer play() sale siempre de un gesto del usuario —cambiar el select
 * de clima o el botón de mute—, así que no lo bloquea la política de autoplay.
 */

/**
 * Momentos del ciclo de 6s en los que el trueno acompaña al relámpago: los keyframes
 * `relampago` de index.css destellan en 38% y 88% (2.28s y 5.28s), y el sonido llega
 * un poco después que la luz. El scheduler arranca junto con la clase .scene--tormenta,
 * o sea en el mismo tick en que arranca la animación CSS.
 */
const TRUENOS_MS = [2450, 5450]
const CICLO_MS = 6000

const VOL_LLUVIA = 0.5
const VOL_LLUVIA_TORMENTA = 0.7
const VOL_TRUENO = 0.65

export function useSonidoClima(llueve: boolean, tormenta: boolean, mute: boolean) {
  const lluviaRef = useRef<HTMLAudioElement | null>(null)
  const truenoRef = useRef<HTMLAudioElement | null>(null)
  // El scheduler de truenos lee el mute desde acá para no reiniciarse (y perder la fase)
  // cada vez que se toca el botón.
  const muteRef = useRef(mute)
  muteRef.current = mute

  // Al mandar el browser a background (cambiar de app, minimizar, cambiar de pestaña) el
  // audio sigue sonando por su cuenta: hay que pausarlo a mano. `pagehide` es para iOS
  // Safari, que al volver de bfcache no siempre dispara visibilitychange.
  const [oculto, setOculto] = useState(() => document.hidden)
  useEffect(() => {
    // El trueno se corta acá y no por el efecto de abajo porque es un one-shot: no tiene
    // un "estado sonando" del que dependa un effect.
    const ocultar = () => {
      setOculto(true)
      truenoRef.current?.pause()
    }
    const sync = () => (document.hidden ? ocultar() : setOculto(false))
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('pagehide', ocultar)
    window.addEventListener('pageshow', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pagehide', ocultar)
      window.removeEventListener('pageshow', sync)
    }
  }, [])

  useEffect(() => {
    if (!llueve || mute || oculto) {
      lluviaRef.current?.pause()
      return
    }
    if (!lluviaRef.current) {
      const a = new Audio('/audio/lluvia.m4a')
      a.loop = true
      lluviaRef.current = a
    }
    const a = lluviaRef.current
    a.volume = tormenta ? VOL_LLUVIA_TORMENTA : VOL_LLUVIA
    // Si el navegador igual lo rechaza, el botón de mute sirve de reintento.
    void a.play().catch(() => {})
  }, [llueve, tormenta, mute, oculto])

  useEffect(() => {
    if (!tormenta) return
    // El intervalo corre aunque esté muteado: así la fase no se desincroniza de la
    // animación CSS cuando el usuario prende y apaga el sonido.
    const pendientes: number[] = []
    const ciclo = () => {
      for (const t of TRUENOS_MS) {
        pendientes.push(
          window.setTimeout(() => {
            if (muteRef.current || document.hidden) return
            if (!truenoRef.current) truenoRef.current = new Audio('/audio/trueno.m4a')
            const a = truenoRef.current
            a.volume = VOL_TRUENO
            a.currentTime = 0
            void a.play().catch(() => {})
          }, t),
        )
      }
    }
    ciclo()
    const id = setInterval(ciclo, CICLO_MS)
    return () => {
      clearInterval(id)
      pendientes.forEach(clearTimeout)
      truenoRef.current?.pause()
    }
  }, [tormenta])

  // Al desmontar no queda nada sonando.
  useEffect(() => () => lluviaRef.current?.pause(), [])
}
