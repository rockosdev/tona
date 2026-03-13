import { createTheme } from 'tona'
import './style.css'

function myPlugin() {
  const h1 = document.createElement('h1')
  h1.textContent = 'hello Tona!'
  h1.className = 'tona-h1'

  const body = document.querySelector('body') as HTMLBodyElement
  body.prepend(h1)
}

createTheme().use(myPlugin)
