// @flow

import { Element } from './elem'

export const t_reprs = {
  pair() {
    return `(${this.children[0].getVal()}, ${this.children[1].getVal()})`
  },
  set() {
    return `SET[${this.children.map(x => x.getVal()).join(', ')}]`
  },
  list() {
    return `${this.value}[${this.children.map(x => x.getVal()).join(', ')}]`
  },
  option() {
    if (this.state === 'some')
      return `Some(${this.children[0].getVal()})`
    else if (this.state === 'default2some')
      return `Option<${Element.getType(this.t[1])}>(${this.continuation ? this.continuation.getVal() : this.value})`
    else if (this.state === 'none')
      return `None`
    else if (this.state === 'default2none')
      return `Option<${Element.getType(this.t[1])}>(None)`
    else if (this.continuation)
      return `Option(${this.continuation.getVal()})`
    else if (this.value)
      return `Option<${Element.getType(this.t[1])}>(${this.value})`
    else {
      debugger
      throw `Invalid option element`
    }
  },
  or() {
    if (this.state === 'left') {
      return this.children[0].getVal()
    } else if (this.state === 'right') {
      return this.children[1].getVal()
    } else if (this.state === 'default2left') {
      return `${this.value}:${Element.getType(this.t)}`
    } else if (this.state === 'default2right') {
      return `${this.value}:${Element.getType(this.t)}`
    } else if (this.state === 'default') {
      return `${this.value}:${Element.getType(this.t)}`
    } else {
      debugger
      throw `Invalid or element`
    }
  },
  big_map() {
    const result = {}
    this.children.forEach(elt => {
      const key = elt.children[0].getVal()
      const value = elt.children[1].getVal()
      result[key] = value
    })

    return JSON.stringify(result) + ':big_map'
  },
  map() {
    const result = {}
    this.children.forEach(elt => {
      const key = elt.children[0].getVal()
      const value = elt.children[1].getVal()
      result[key] = value
    })

    return JSON.stringify(result) + ':map'
  }
}

export const reprs = {
  ABS() {
    return `ABS(${this.getStackVal(0)})`
  },
  ADD() {
    const [s0, s1] = this.getStackVals(0, 2)
    if (this.isConcrate(0, 1)) {
      return parseInt(s0) + parseInt(s1)
    } else
      return `${s0} + ${s1}`
  },
  SUB() {
    const [s0, s1] = this.getStackVals(0, 2)
    if (this.isConcrate(0, 1)) {
      return parseInt(s0) - parseInt(s1)
    } else
      return `${s0} - ${s1}`
  },
  MUL() {
    const [s0, s1] = this.getStackVals(0, 2)
    if (this.isConcrate(0, 1)) {
      return parseInt(s0) * parseInt(s1)
    } else
      return `${s0} * ${s1}`
  },
  AND() {
    const [s0, s1] = [this.getStackVal(0), this.getStackVal(1)]
    return `${s0} & ${s1}`
  },
  COMPARE() {
    return [this.getStackVal(0), this.getStackVal(1)]
  },
  GT() {
    const [a, b] = this.getStackVal(0)
    return `${a} > ${b}`
  },
  EQ() {
    const [a, b] = this.getStackVal(0)
    return `${a} == ${b}`
  },
  NEQ() {
    const [a, b] = this.getStackVal(0)
    return `${a} <> ${b}`
  },
  LE() {
    const [a, b] = this.getStackVal(0)
    return `${a} <= ${b}`
  },
  LT() {
    const [a, b] = this.getStackVal(0)
    return `${a} < ${b}`
  },
  GE() {
    const [a, b] = this.getStackVal(0)
    return `${a} >= ${b}`
  },
  FAILWITH() {
    return `FAIL(${this.getStackVal(0)})`
  },
  IMPLICIT_ACCOUNT() {
    return `CONTRACT(${this.getStackVal(0)})`
  },
  TRANSFER_TOKENS() {
    const [entry] = this.stack[2].annots || []
    const contract = entry ? this.stack[2].value : this.getStackVal(2)
    return `TRANSFER_TO(${entry ? `${contract}.${entry}` : contract}, ${this.getStackVal(1)}, ${this.getStackVal(0)})`
  },
  CONCAT() {
    const [a, b] = this.stack
    if (b)
      return `CONCAT(${a.getVal()}, ${b.getVal()})`
    else
      return `CONCAT(${a.getVal()})`
  },
  PACK() {
    return `PACK(${this.getStackVal(0)})`
  },
  CHECK_SIGNATURE() {
    const [key, signature, bytes] = this.getStackVals(0, 3)
    return `CHECK_SIG(${key}, ${signature}, ${bytes})`
  },
  CONTRACT() {
    return `CONTRACT(${this.getStackVal(0)})`
  },
  CREATE_CONTRACT() {
    return `CREATE_CONTRACT(${this.getStackVals(0, 3).join(', ')})`
  },
  CREATE_CONTRACT_ADDR() {
    const elem = this.stack[0]
    return `${elem.value}:${Element.getType(elem.t)} <- CREATE_CONTRACT(${this.getStackVals(1, 4).join(', ')})`
  },
  MEM() {
    return `(${this.getStackVal(0)} IN ${this.getStackVal(1)})`
  },
  GET() {
    const [key, group] = this.getStackVals(0, 2)
    return `${group}.GET(${key})`
  },
  BLAKE2B() {
    return `BLAKE2B(${this.getStackVal(0)})`
  },
  ADDRESS() {
    return `ADDRESS(${this.getStackVal(0)})`
  },
  ISNAT() {
    return `ISNAT(${this.getStackVal(0)})`
  },
  SET_DELEGATE() {
    return `SET_DELEGATE(${this.getStackVal(0)})`
  },
  EXEC() {
    return `${this.getStackVal(1)}.EXEC(${this.getStackVal(0)})`
  },
  IF_CONS() {
    const elem = this.stack[0]
    return `${elem.value}:${Element.getType(elem.t)} <- ${this.getStackVal(1)}`
  }
}



