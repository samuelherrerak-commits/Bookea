import { Composition } from 'remotion'
import { Vlog } from './Vlog'
import { duracionTotal } from './tiempo'
import { FPS, type Edicion } from './tipos'
import './fuentes'

// Ejemplo para abrir el Studio sin video; editar.mjs siempre pasa sus propias props.
const ejemplo: Edicion = {
  video: '',
  segmentos: [{ desde: 0, hasta: 6 }],
  captions: [],
  gancho: 'Así es un día emprendiendo',
  cierre: true,
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
