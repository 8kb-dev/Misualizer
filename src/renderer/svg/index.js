// @flow

import { throttle } from '../../utils'

import { Component, Rect, Arrow, Curve, AutoCurve, Text, TextBlock } from './components'

export class SVGRenderer {
  position : [number, number]

  constructor() {
    this.position = [100, 20]
  }

  getPosition() {
    const result = this.position
    this.position = [{
      [300]: 500,
      [500]: 100,
      [100]: 300
    }[this.position[0]], this.position[1] + 25] 
    return result
  }

  drawPath(path : Array<Object>, prev_graph? : Component) {
    const graphs = []

    path.forEach((node, index) => {
      if (!index) {
        graphs.push(Text(this.getPosition(), node.name))
        if (prev_graph) {
          const curve = AutoCurve(
            prev_graph, 
            graphs[0], 
            node.kind === 'arrow-node', 
            node.arrow,
            node.kind === 'arrow-node' ? undefined : {
              stroke: 'gray',
              'stroke-width': '2',
            }) 
          graphs.push(curve)
        }
        prev_graph = graphs[0]
      } else if (node.kind === 'arrow-node') {
        graphs.push(Text(this.getPosition(), node.name))

        if (prev_graph)
          graphs.push(AutoCurve(prev_graph, graphs[graphs.length - 1], true, node.arrow))

        prev_graph = graphs[graphs.length - 2]
      } else if (node.kind === 'branch') {
        graphs.push(this.drawPath(node.path, prev_graph))
      }

      if (node.paths) {
        const inside_nodes = new Component(node.paths.map(path => this.drawPath(path, prev_graph)))
        inside_nodes.hide()
        if (prev_graph)
          prev_graph.on('click', () => {inside_nodes.toggle()})

        graphs.push(inside_nodes)
      }
    })

    return new Component(graphs)
  }

  render(graph : Object, width : number = 1000, height : number = 1000) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    const component = this.drawPath([graph])
    svg.appendChild(component.el)
    return svg
  }

  drawMock(graph : Object, with_arrow : boolean) {
    const top_text = Text([0,0], graph.name)
    const levels = {
      [0]: [top_text]
    }
    const links = []

    const walk = (paths : Array<Object>, parent_graph : Component, level : number) => {
      if (!levels[level])
        levels[level] = []

      paths.forEach(path => {
        if (path.name) {
          const text = Text([0,0], path.name)
          if (path.name.indexOf(':') === -1) {
            text.setAttrs({
              fill: '#aaa'
            })
          }

          links.push({
            from: parent_graph,
            to: text,
            arrow: path.arrow
          })
          levels[level].push(text)
          parent_graph = text
        } else if (path.kind === 'branch') {
          walk(path.path, parent_graph, level + 1)
        }
      })

    }

    walk(graph.paths[0], top_text, 1)

    let max_width = 0
    let max_height = 0
    const len_mapping = {}
    for (let level in levels) {
      const len = levels[level].reduce((acc, x) => acc + x.key_points[1][0] - x.key_points[3][0], 0)
      len_mapping[level] = len

      if (len > max_width)
        max_width = len
    }

    max_width += 500

    const result = []
    for (let level in levels) {
      levels[level].forEach((item, index) => {
        const top = +level ? +level * 200 : 20
        max_height = top

        const span = (max_width - len_mapping[level]) / (levels[level].length + 1)
        if (index) {
          const left = levels[level][index - 1].key_points[1][0]
          item.relocate([left + span, top])
        } else {
          item.relocate([span, top])
        }

        result.push(item)
      })
    }

    links.forEach(link => {
      const curve = AutoCurve(link.from, link.to, with_arrow, link.arrow)
      result.push(curve)
    })

    return {
      component: new Component(result),
      width: max_width,
      height: max_height
    }
  }

  bindMouseControl(svg : Object, init_width : number, init_height : number) {
    let [x, y, width, height] = [0, 0, init_width, init_height]
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)

    let start_moving = false
    let cursor = [0, 0]
    svg.addEventListener('mousedown', (e) => {
      cursor = [e.clientX, e.clientY]
      start_moving = true
    })
    svg.addEventListener('mousemove', throttle((e) => {
      if (!start_moving) return false

      svg.setAttribute('viewBox', `${x + cursor[0] - e.clientX} ${y + cursor[1] - e.clientY} ${width} ${height}`)
    }))

    const leaveFn = (e) => {
      if (start_moving) {
        x += cursor[0] - e.clientX
        y += cursor[1] - e.clientY
      }
      start_moving = false
    }
    svg.addEventListener('mouseup', leaveFn)
    svg.addEventListener('mouseleave', leaveFn)
    svg.addEventListener('wheel', (e) => {
      e.preventDefault()

      let offset = 0
      if (e.deltaY > 1) {
        offset += 50
      } else if (e.deltaY < -1) {
        offset -= 50
      }

      if (width + offset > 10) {
        width += offset
        x -= offset / 2
      }

      if (height + offset > 10) {
        height += offset
        y -= offset / 2
      }


      svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)
      return false
    })
  }

  renderMockData(graph : Object, with_arrow : boolean = false) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const {component, width, height} = this.drawMock(graph, with_arrow)
    svg.appendChild(component.el)

    this.bindMouseControl(svg, width, height)
    return svg
  }

  extractValue(node : Object) {
    if (typeof node === 'string')
      return node

    const kind_mapping = {
      key_hash: () => this.extractValue(node.value),
      or: () => `[${this.extractValue(node.children[0])} | ${this.extractValue(node.children[1])}]`,
      lambda: () => this.extractValue(node.value),
      exec: () => `${node.value} <- ${node.lambda}(${this.extractValue(node.parameter)})`,
      unit: () => 'Unit',
      pair: () => `(${this.extractValue(node.children[0])}, ${this.extractValue(node.children[1])})`,
      bool: () => node.value instanceof Boolean ? node.value : this.extractValue(Object.assign(node.value, {symbol: node.symbol})),
      fail: () => `FAIL:${this.extractValue(node.value)}`,
      list: () => `List:${node.value || this.extractValue(node.t)}`,
      compare: () => `${this.extractValue(node.value[0])} ${node.symbol} ${this.extractValue(node.value[1])} ?`,
      mutez: () => this.extractValue(node.value),
      address: () => typeof node.value === 'string' ? node.value : this.extractValue(node.value),
      contract: () => this.extractValue(node.value)
    }

    if (!(node.kind in kind_mapping))
      throw `Cannot extract value from ${node.kind}`

    return kind_mapping[node.kind]()
  }

  drawCode(graph : Object, node_mapping : Object, with_arrow : boolean = false) {
    console.log(123, node_mapping)
    
    const top_text = Text([20,20], graph.name)
    const levels = {
      [0]: [top_text]
    }
    const links = []

    const walk = (paths : Array<Object>, parent_graph : Component, level : number) => {
      if (!levels[level])
        levels[level] = []

      paths.forEach(path => {
        if (path.name) {
          const node = node_mapping[path.name.slice(4)]
          const text = TextBlock([0,0], [`*${node.name}*`].concat(node.value.map(x => this.extractValue(x))))

          links.push({
            from: parent_graph,
            to: text,
            arrow: path.arrow
          })
          levels[level].push(text)
          parent_graph = text
        } else if (path.kind === 'branch') {
          walk(path.path, parent_graph, level + 1)
        }
      })

    }

    walk(graph.paths[0], top_text, 1)

    let max_width = 0
    let max_height = 0
    const len_mapping = {}
    for (let level in levels) {
      const len = levels[level].reduce((acc, x) => acc + x.key_points[1][0] - x.key_points[3][0], 0)
      len_mapping[level] = len

      if (len > max_width)
        max_width = len
    }

    max_width += 500

    const result = []
    for (let level in levels) {
      levels[level].forEach((item, index) => {
        const top = +level ? +level * 200 : 20
        max_height = top

        const span = (max_width - len_mapping[level]) / (levels[level].length + 1)
        if (index) {
          const left = levels[level][index - 1].key_points[1][0]
          item.relocate([left + span, top])
        } else {
          item.relocate([span, top])
        }

        result.push(item)
      })
    }

    const from_nodes= new Set(links.map(link => link.from))
    links.forEach((link, index) => {
      const curve = AutoCurve(link.from, link.to, with_arrow, link.arrow)
      if (!from_nodes.has(link.to))
        link.to.setAttrs({
          fill: 'red'
        })

      result.push(curve)
    })

    return {
      component: new Component(result),
      width: max_width,
      height: max_height
    }
  }

  renderCode(graph : Object, node_mapping : Object, graph_parameter : Object, graph_storage : Object) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const {component, width, height} = this.drawCode(graph, node_mapping)
    svg.appendChild(component.el)
    {
      const {component} = this.drawMock(graph_parameter, false)
      component.setAttrs({
        transform: 'translate(-500,0)'
      })
      svg.appendChild(component.el)
    }
    {
      const {component} = this.drawMock(graph_storage, false)
      component.setAttrs({
        transform: 'translate(-500,500)'
      })
      svg.appendChild(component.el)
    }

    this.bindMouseControl(svg, width, height)
    return svg
  }

}