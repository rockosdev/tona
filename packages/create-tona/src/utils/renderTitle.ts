import gradient from 'gradient-string'

import { TITLE_TEXT } from '../consts.js'

const tonaTheme = {
  blue: '#add7ff',
  cyan: '#89ddff',
  green: '#5de4c7',
  magenta: '#fae4fc',
  red: '#d0679d',
  yellow: '#fffac2',
}

export function renderTitle() {
  const tonaGradient = gradient(Object.values(tonaTheme))
  console.log(tonaGradient.multiline(TITLE_TEXT))
}
