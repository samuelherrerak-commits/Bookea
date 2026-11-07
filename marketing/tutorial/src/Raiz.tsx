import { Composition } from 'remotion'
import { FPS, linea } from './guion'
import { tema } from './tema'
import { Tutorial } from './Tutorial'

export const Raiz: React.FC = () => (
  <Composition id="Tutorial" component={Tutorial} durationInFrames={linea(FPS).total} fps={FPS} width={tema.ancho} height={tema.alto} />
)
