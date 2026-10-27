import { createRoot, type Root } from 'react-dom/client'
import { TshirtCustomizer } from './components/TshirtCustomizer'

/**
 * Mount the customizer into any DOM node (e.g. a WordPress shortcode container).
 */
export function mountTshirtCustomizer(container: HTMLElement): () => void {
  const root: Root = createRoot(container)
  root.render(<TshirtCustomizer />)
  return () => root.unmount()
}
