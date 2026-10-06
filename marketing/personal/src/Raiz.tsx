import { Composition } from 'remotion'
import { Vlog } from './Vlog'
import { duracionTotal } from './tiempo'
import { FPS, type Edicion } from './tipos'
import './fuentes'

// Ejemplo mínimo para abrir el Studio sin video. Ojo: Remotion MEZCLA estas props con las
// que pasa editar.mjs, así que aquí no va nada opcional (gancho, cierre…) que pueda colarse.
const ejemplo: Edicion = {
  video: '',
  segmentos: [{ desde: 0, hasta: 6 }],
  captions: [],
}

export const Raiz: React.FC = () => (
  <Composition
    id="Vlog"
    component={Vlog}
    fps={FPS}
    width={1080}
    height={1920}
    durationInFrames={Math.round(duracionTotal(ejemplo) * FPS)}
    defaultProps={ejemplo}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, Math.round(duracionTotal(props) * FPS)),
    })}
  />
)
