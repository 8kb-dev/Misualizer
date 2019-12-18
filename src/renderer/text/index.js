// @flow

import { Element } from '../../emu/elem'
import { Stack } from '../../emu/contract'
import { t_reprs, instr_reprs } from '../repr'

function getInstrRepr(elem : Element, pattern : Object) {
  let cursor = elem
  let handler = pattern[cursor.instr]

  while (!(handler instanceof Function)) {
    if (!handler)
      return null

    cursor = cursor.subs[0]
    if (!cursor)
      return null

    handler = handler[cursor.instr]
  }

  return handler
}


export class TextRenderer {
  stack : Stack
  patterns : Array<Object>
  is_raw : bool
  constructor(stack : Stack, patterns : Array<Object> = []) {
    this.stack = stack
    this.patterns = patterns.concat(instr_reprs)
    this.is_raw = false
  }

  render() {
    return `${this.stack.stack.map(elem => this.renderElement(elem)).join(', ')}`
  }

  renderElement(elem : Element) : string {
    if (elem.instr) {
      if (!this.is_raw) {
        // apply instr patterns
        for (let i = 0; i < this.patterns.length; i++) {
          const handler = getInstrRepr(elem, this.patterns[i])
          if (handler)
            return `${handler(elem, (elem) => this.renderElement(elem))}`
        }
      }

      return `${elem.instr}(${elem.subs.map(x => this.renderElement(x)).join(', ')})` 
    } else {
      const t = elem.t[0].toString()

      if (t_reprs[t]) {
        return t_reprs[t](elem, (elem) => this.renderElement(elem))
      } else if (elem.annots.length) {
        return elem.annots[0] + ':' + elem.t[0].toString()
      } else if (elem.value !== null) {
        return elem.value
      } else {
        debugger
        throw `renderElement / unhandled type: ${t}`
      }
    }
  }
}