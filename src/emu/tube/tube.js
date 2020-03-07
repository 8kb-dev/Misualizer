// @flow

import { Stack } from './stack'
import { instr_mapping } from './instr'

type NodeWithStack = {
  node: Tube | Joint | null,
  stack: Stack
}

export class Valve {
  start : NodeWithStack
  cursors : NodeWithStack[]
  mem : {number: Stack[]}

  constructor(node : Tube | Joint, stack : Stack) {
    this.start = {stack, node}
    this.cursors = [{stack, node}]
    this.mem = {}
  }

  addMem(node : Tube | Joint | null, result : Stack | Stack[]) {
    if (!node)
      return;

    if (!(node.id in this.mem))
      this.mem[node.id] = []

    this.mem[node.id] = this.mem[node.id].concat(result)
  }

  flowOnce() {
    let next_cursors = []

    this.cursors.forEach(cursor => {
      if (!cursor.node)
        return;

      const result = cursor.node.flow(cursor.stack)
      this.addMem(cursor.node, result instanceof Array ? result.map(x => x.stack) : result.stack)
      next_cursors = next_cursors.concat(result)
    })

    this.cursors = next_cursors.filter(x => !x.stack.is_failed())
  }
}

export class Tube {
  id : number
  code : Object[]
  next : Tube | Joint | null

  constructor(id : number, code : Object[], next? : Tube | Joint | null = null) {
    this.id = id
    this.code = code
    this.next = next
  }

  flow(stack : Stack) : NodeWithStack {
    stack = stack.clone()

    this.code.forEach(item => {
      if (item.prim in instr_mapping)
        instr_mapping[item.prim](stack, item)
      else {
        throw `unhandled code instr in Tube: ${item.prim}`
      }
    })

    stack.path.push(this.id)
    return {
      node: this.next,
      stack
    }
  }
}

const joint_set = new Set(['IF', 'IF_LEFT', 'IF_NONE', 'IF_CONS', 'LOOP', 'LOOP_LEFT', 'ITER'])
export class Joint {
  id : number
  t : string
  nexts : (Tube | Joint)[]

  constructor(id : number, t : string, nexts : (Tube | Joint)[]) {
    this.id = id
    this.t = t
    this.nexts = nexts
  }

  flow(stack : Stack) : NodeWithStack[] {
    stack = stack.clone()
    if (this.t in instr_mapping) {
      const stacks = instr_mapping[this.t](stack)
      return stacks.map((stack, i) => {
        return {
          node: this.nexts[i],
          stack
        }
      })
    }
    else {
      throw `unhandled code instr in Joint: ${this.t}`
    }
  }
}

export function makePlainCode(code : Object[]) {
  if (!(code instanceof Array))
    return code

  const result = []
    
  code.forEach(item => {
    if (item instanceof Array) {
      const plain_item = makePlainCode(item)
      plain_item.forEach(x => result.push(x))

    } else if (item.prim === 'DIP') {
      const level = item.args[0].int ? item.args.shift().int : '1'
      result.push({prim: 'CURSOR', args: [{int: level}]})
      makePlainCode(item.args[0]).forEach(x => result.push(x))
      result.push({prim: 'CURSOR', args: [{int: '-' + level}]})

    } else if (item.prim && item.args) {
      item.args = item.args.map(x => makePlainCode(x))
      result.push(item)

    } else
      result.push(item)

  })

  return result
}

export function codeConvert(code : Object[]) : Tube {
  let id = 1

  code = makePlainCode(code)

  const walk = (code : Object[], last? : Tube) : Tube => {
    const passing_code = []

    for (let i = 0; i < code.length; i++) {
      if (joint_set.has(code[i].prim)) {
        const remaining = walk(code.slice(i + 1), last)
        return new Tube(id++, passing_code, new Joint(
          id++, code[i].prim, [
            walk(code[i].args[0], remaining), 
            code[i].args.length > 1 ? walk(code[i].args[1], remaining) : remaining
          ]
        ))
      }
      
      passing_code.push(code[i])
    }

    if (!passing_code.length && !last)
      return new Tube(0, [])
    else
      return new Tube(id++, passing_code, last)
  }

  const result = walk(code)
  return result
}