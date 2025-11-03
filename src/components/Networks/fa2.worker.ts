/* eslint-disable no-restricted-globals */
import Graph from "graphology"
import forceAtlas2 from "graphology-layout-forceatlas2"

type NodeIn = { id: string; x?: number; y?: number }
type EdgeIn = { source: string; target: string; weight?: number }

type RunMsg = {
  type: "run"
  iterations?: number
  chunkSize?: number
  settings?: Record<string, any>
  directed?: boolean
  nodes: NodeIn[]
  edges: EdgeIn[]
}
type StopMsg = { type: "stop" }
type InMsg = RunMsg | StopMsg

type Position = { id: string; x: number; y: number }
type OutMsg =
  | { type: "progress"; progress: number }
  | { type: "tick"; progress: number; positions: Position[] }
  | { type: "done"; positions: Position[] }
  | { type: "stopped" }
  | { type: "error"; message: string }

const ctx: DedicatedWorkerGlobalScope = self as any

let running = false
let aborted = false

ctx.onmessage = (ev: MessageEvent<InMsg>) => {
  const msg = ev.data
  if (!msg) return

  if (msg.type === "stop") {
    aborted = true
    return
  }

  if (msg.type === "run") {
    try {
      // Reset flags for new run
      aborted = false
      running = true

      const g = new Graph({ multi: true, type: msg.directed ? "directed" : "undirected" })
      for (const n of msg.nodes) {
        g.addNode(n.id, { x: n.x ?? Math.random(), y: n.y ?? Math.random() })
      }
      for (const e of msg.edges) {
        if (g.hasNode(e.source) && g.hasNode(e.target)) {
          g.addEdge(e.source, e.target, { weight: e.weight })
        }
      }

      const total = Number.isFinite(msg.iterations) ? (msg.iterations as number) : 1000
      const chunk = Math.max(1, Math.min(total, Number.isFinite(msg.chunkSize) ? (msg.chunkSize as number) : 50))
      const settings = { slowDown: 10, gravity: 1, ...(msg.settings || {}) }

      let done = 0
      let tickCount = 0
      const step = () => {
        if (aborted) {
          running = false
          ctx.postMessage({ type: "stopped" } as OutMsg)
          return
        }
        const it = Math.min(chunk, total - done)
        if (it <= 0) {
          const positions = g.nodes().map((id) => ({ id, x: g.getNodeAttribute(id, "x"), y: g.getNodeAttribute(id, "y") }))
          running = false
          ctx.postMessage({ type: "done", positions } as OutMsg)
          return
        }
        try {
          forceAtlas2.assign(g, { iterations: it, settings })
          done += it
          const progress = Math.max(0, Math.min(100, Math.round((done / total) * 100)))
          // Send positions every chunk for iterative updates
          const positions = g.nodes().map((id) => ({ id, x: g.getNodeAttribute(id, "x"), y: g.getNodeAttribute(id, "y") }))
          ctx.postMessage({ type: "tick", progress, positions } as OutMsg)
          tickCount += 1
          // Yield to allow stop messages
          setTimeout(step, 0)
        } catch (err: any) {
          running = false
          ctx.postMessage({ type: "error", message: String(err?.message || err || "Worker error") } as OutMsg)
        }
      }

      // kick off
      step()
    } catch (err: any) {
      running = false
      ctx.postMessage({ type: "error", message: String(err?.message || err || "Worker error") } as OutMsg)
    }
  }
}
