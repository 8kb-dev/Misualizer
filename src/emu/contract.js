// @flow

import type { EType } from './elem'
import { Element } from './elem'
import { instrs } from './instr'

const t_keep_args = new Set(
  ['lambda', 'option', 'list', 'map', 'big_map', 'set', 'contract']
)
const elt_types = new Set(
  ['map', 'big_map']
)
const micheline_mapping = {
  int: new Set(['int', 'nat', 'mutez', 'timestamp']),
  string: new Set(['string', 'key_hash', 'address', 'chain_id']),
  bytes: new Set(['bytes', 'key', 'signature']),
  unit: new Set(['unit']),
  bool: new Set(['bool'])
}

export class Stack {
  stack : Array<Element>
  dip_top : number
  conditions : Array<Element>

  constructor(stack : Array<Element>) {
    this.stack = stack
    this.dip_top = 0
    this.conditions = []
  }

  length() {
    return this.stack.length
  }
  
  is_failed() {
    if (this.stack.indexOf(undefined) > -1) {
      debugger
      throw `Error stack item found: undefined`
    } else if (this.stack.some(x => x.t[0] === 'fail')) {
      return true
    }

    return false
  }

  at(index : number) : Element {
    return this.stack[index]
  }

  top() : Element {
    return this.stack[this.dip_top]
  }

  replace(fn : Element => Element) {
    this.stack[this.dip_top] = fn(this.stack[this.dip_top])
  }

  topn(count : number) : Array<Element>  {
    return this.stack.slice(this.dip_top, this.dip_top + count)
  }

  drop(count : number) : Array<Element> {
    return this.stack.splice(this.dip_top, count)
  }
  dropAt(index : number) : Element {
    const [result] = this.stack.splice(this.dip_top + index, 1)
    if (!result)
      throw `Error when stack drops element at index:${index}`

    return result
  }

  insert(elem : Element) {
    this.stack.splice(this.dip_top, 0, elem)
  }
  insertAt(index : number, elem : Element) {
    this.stack.splice(this.dip_top + index, 0, elem)
  }

  pushCond(elem : Element, cond : string | Element => void) {
    const cloned = elem.clone()
    if (typeof cond === 'string') {
      cloned.state = cond
    } else {
      cond(cloned)
    }
    this.conditions.push(cloned)
  }

  clone() {
    const result = new Stack(this.stack.map(item => item.clone()))
    result.dip_top = this.dip_top
    result.conditions = this.conditions.map(item => item.clone())
    return result
  }

  getCondVal() {
    return this.conditions.map(x => x.getVal())
  }
}

export class Contract {
  stack : Stack
  code : Array<Object>
  mem : {
    parameter: number,
    storage: number,
    generate: number,
    mock: number
  }

  constructor(contract_raw : Array<Object>) {
    const contract = {}
    contract_raw.forEach(item => {
      const key = item.prim
      contract[key] = item.args[0]
    })
    
    this.mem = {
      parameter: 0,
      storage: 0,
      generate: 0,
      mock: 0
    }
    this.code = contract.code
    this.stack = new Stack([this.newElement({
      t: ['pair', this.readType(contract.parameter), this.readType(contract.storage)],
      children: [
        this.mockElements(contract.parameter, 'parameter'),
        this.mockElements(contract.storage, 'storage')
      ]
    })])

    const x = this.mockMichelineData(contract.parameter)
    debugger
  }

  getId(field? : 'parameter' | 'storage' | 'generate' | 'mock') {
    if (!field)
      return ''

    this.mem[field]++

    return ({
      parameter: 'P',
      storage: 'S',
      generate: 'G',
      mock: 'M'
    })[field] + this.mem[field]
  }

  readType(t : Object) : EType {
    if (t.args instanceof Array) {
      return [t.prim].concat(t.args.map(x => this.readType(x)))
    } else {
      return [t.prim]
    }
  }
  fallbackType(t : EType | string) : Object {
    if (typeof t === 'string')
      return {prim: t}

    if (t.length > 1) {
      return {
        prim: t[0],
        args: t.slice(1).map((x : string | EType) => this.fallbackType(x))
      }
    } else {
      return {prim: t[0]}
    }
  }

  newElement(params : Object, field? : 'parameter' | 'storage' | 'generate' | 'mock') {
    const value = this.getId(field)
    return new Element(params, value)
  }

  mockMichelineData(t : Object) {
    const mapping = {
      int: () => {
        return {int: '1'}
      },
      nat: () => {
        return {int: '1'}
      },
      string: () => {
        return {string: 'string'}
      },
      bytes: () => {
        return {bytes: 'bytes'}
      },
      mutez: () => {
        return {int: '1'}
      },
      bool: () => {
        return {prim: 'True'}
      },
      key_hash: () => {
        return {string: 'key_hash'}
      },
      timestamp: () => {
        return {int: '0'}
      },
      address: () => {
        return {string: 'address'}
      },
      key: () => {
        return {bytes: '0x00'}
      },
      unit: () => {
        return {prim: 'Unit'}
      },
      signature: () => {
        return {bytes: '0x00'}
      },
      option: () => {
        return {prim: 'None'}
      },
      list: () => {
        return [this.mockMichelineData(t.args[0])]
      },
      set: () => {
        return [this.mockMichelineData(t.args[0])]
      },
      contract: () => {
        return {prim: 'Contract'}
      },
      pair: () => {
        return {prim: 'Pair', args: [
          this.mockMichelineData(t.args[0]),
          this.mockMichelineData(t.args[1])
        ]}
      },
      or: () => {
        return {prim: 'Left', args: [this.mockMichelineData(t.args[0])]}
      },
      lambda: () => {
        return {prim: 'Lambda', args: []}
      },
      map: () => {
        return [{prim: 'Elt', args: [
          this.mockMichelineData(t.args[0]),
          this.mockMichelineData(t.args[1])
        ]}]
      },
      big_map: () => {
        return [{prim: 'Elt', args: [
          this.mockMichelineData(t.args[0]),
          this.mockMichelineData(t.args[1])
        ]}]
      },
      chain_id() {
        return {string: 'chain_id'}
      }
    }
    
    if (!mapping[t.prim])
      throw `invalid prim: ${t.prim}`

    return mapping[t.prim]()
  }

  mockInsideElements(t : Object) {
    if (t.prim === 'list' || t.prim === 'set') {
      return [this.mockElements(t.args[0], 'mock')]
    } else if (t.prim === 'map' || t.prim === 'big_map') {
      return [this.mockElements({prim: 'elt', args: t.args}, 'mock')]
    } else {
      return []
    }
  }

  mockElements(t : Object, field : 'parameter' | 'storage' | 'generate' | 'mock' = 'generate') {
    return this.newElement({
      t: this.readType(t),
      annots: t.annots,
      children: t_keep_args.has(t.prim) ? this.mockInsideElements(t) : t.args ? t.args.map(x => this.mockElements(x, field)) : [],
      instr: t.prim === 'lambda' ? t : null
    }, field)
  }

  createElements(t : Object, v : Object) {
    let result = this.newElement(
      elt_types.has(t.prim) ?
      {
        t: this.readType(t),
        children: v.map((x, i) => this.createElements({prim: 'elt', args: t.args}, x))
      } : v.args instanceof Array ?
      {
        t: this.readType(t),
        annots: v.annots,
        children: v.args.map((x, i) => this.createElements(t.args[i], x))
      } : {
        t: this.readType(t),
        value: Object.values(v)[0]
      }
    )
    
    const t_str = result.t[0].toString()
    if (t_str === 'option') {
      result.state = result.value === 'None' ? 'none' : 'some'
    } else if (t_str === 'or') {
      debugger
    } else if (t_str === 'lambda') {
      result.state = v
    }
    return result
  }

  walkCode(code : Array<Object>, stacks : Array<Stack>) : Array<Stack> {
    const failed_stacks = []
    code.forEach((instr, instr_index) => {
      if (instr instanceof Array) {
        stacks = this.walkCode(instr, stacks)
        return;
      }

      if (!(instr.prim in instrs)) {
        debugger
        throw `Unhandled instr: ${instr.prim}`
      }

      const new_stacks = []
      stacks.forEach(stack => {
        if (stack.is_failed()) {
          failed_stacks.push(stack)
          return;
        }

        const result : Stack | Array<Stack> = instrs[instr.prim].call(this, stack, instr)
        ;(result instanceof Array ? result : [result]).forEach(x => {new_stacks.push(x)})

        // instant check
        new_stacks.forEach(stack => stack.is_failed())
      })
      stacks = new_stacks
    })

    return stacks.concat(failed_stacks)
  }

  symbolRender(t : string | null) {
    const mapping = {
      true: '✔️',
      false: '❌',
      default2true: '✔️',
      default2false: '❌',

      left: '👈',
      right: '👉',
      default2left: '👈',
      default2right: '👉',

      some: '🈶',
      none: '🈚️',
      default2some: '🈶',
      default2none: '🈚️',

      empty: '🈳',
      non_empty: '🈶',
      default2empty: '🈳',
      default2non_empty: '🈶',
      
      default: '❓'
    }
    
    if (!t || !(t in mapping)) {
      debugger
      throw `Invalid symbol`
    } else
      return mapping[t]
  }

  logResult(stacks : Array<Stack>) {
    const {start, fails, results} = this.stacksToText(stacks)
    console.log(`%cStart%c: ${start}`, 'background: #006621; color: white', 'color: black')

    results.forEach(([conds, result], index) => {
      const index_len = index.toString().length + 1
      console.log(`${index}.%cCondition%c: ${conds}`, 'background: #def', 'color: black')
      console.log(`${' '.repeat(index_len)}%cResult%c: ${result}`, 'background: #1a0dab; color: white', 'color: black')
    })

    fails.forEach(([conds, result], index) => {
      const index_len = index.toString().length + 1
      console.log(`${index}.%cCondition%c: ${conds}`, 'background: #def', 'color: black')
      console.log(`${' '.repeat(index_len)}%cFailure%c: ${result}`, 'background: #c00; color: white', 'color: black')
    })
  }

  stacksToText(stacks : Array<Stack>) {
    const result = {
      start: this.stack.at(0).getVal(),
      fails: [],
      results: []
    }

    stacks.forEach((stack, index) => {
      const conds = stack.conditions.map(x => `${x.getVal()}${this.symbolRender(x.state)}`).join(' -> ')
      const val = stack.at(0).getVal()

      if (stack.is_failed()) {
        result.fails.push([conds, val])
      } else {
        result.results.push([conds, val])
      }
    })

    return result
  }

  walkToExit() {
    return this.walkCode(this.code, [this.stack.clone()])
  }
}