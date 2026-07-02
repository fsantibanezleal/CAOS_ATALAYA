// Turn a flat M/M/c event timeline into per-customer intervals (with a reconstructed server assignment)
// and a rich per-frame query that drives the animation: transit dots, per-server flashes, count pulses.
import type { Trace } from "./types";

export interface Customer {
  id: number;
  arrival: number;
  start: number;
  depart: number;
  server: number; // reconstructed slot index (0..c-1), -1 if never served
}

export function buildCustomers(trace: Trace): Customer[] {
  const map = new Map<number, Customer>();
  for (const e of trace.timeline.events) {
    if (typeof e.id !== "number") continue;
    let c = map.get(e.id);
    if (!c) {
      c = { id: e.id, arrival: NaN, start: NaN, depart: NaN, server: -1 };
      map.set(e.id, c);
    }
    if (e.kind === "arrival") c.arrival = e.t;
    else if (e.kind === "start") c.start = e.t;
    else if (e.kind === "depart") c.depart = e.t;
  }
  return [...map.values()].sort((a, b) => a.arrival - b.arrival);
}

/**
 * Reconstruct which server each customer used. The trace doesn't record it, but a valid assignment is:
 * process customers in service-start order and give each the lowest-index server that is free by then.
 * This is deterministic and consistent — enough to animate "which server" the dots go to.
 */
export function assignServers(customers: Customer[], c: number): void {
  const freeAt = new Array(c).fill(-Infinity); // slot -> time it becomes free
  const byStart = customers.filter((x) => !Number.isNaN(x.start)).sort((a, b) => a.start - b.start);
  for (const cust of byStart) {
    let slot = -1;
    for (let i = 0; i < c; i++) {
      if (freeAt[i] <= cust.start + 1e-9) {
        slot = i;
        break;
      }
    }
    if (slot === -1) {
      let lo = 0;
      for (let i = 1; i < c; i++) if (freeAt[i] < freeAt[lo]) lo = i;
      slot = lo;
    }
    cust.server = slot;
    freeAt[slot] = cust.depart;
  }
}

export interface ServerSlot {
  customer: Customer | null; // currently in service here
  recv: number; // 0..1 flash intensity: a customer just started here
  deliver: number; // 0..1 flash intensity: a customer just departed from here
}

export interface TransitDot {
  id: number;
  server: number;
  p: number; // 0..1 progress
}

export interface Frame {
  t: number;
  arrived: number;
  served: number;
  waiting: Customer[];
  servers: ServerSlot[];
  transitsIn: TransitDot[]; // queue -> server (just started service)
  transitsOut: TransitDot[]; // server -> sink (just departed)
  sourceFlash: number; // recent arrival
  sinkFlash: number; // recent departure
}

const intensity = (t: number, ev: number, w: number) => {
  const d = t - ev;
  return d >= 0 && d < w ? 1 - d / w : 0;
};

/** Build the animation frame at simulation time `t`. `w` is the flash/transit window in sim-time. */
export function frameAt(customers: Customer[], c: number, t: number, w: number): Frame {
  const servers: ServerSlot[] = Array.from({ length: c }, () => ({ customer: null, recv: 0, deliver: 0 }));
  const waiting: Customer[] = [];
  const transitsIn: TransitDot[] = [];
  const transitsOut: TransitDot[] = [];
  let arrived = 0;
  let served = 0;
  let sourceFlash = 0;
  let sinkFlash = 0;

  for (const cust of customers) {
    if (cust.arrival <= t) {
      arrived++;
      sourceFlash = Math.max(sourceFlash, intensity(t, cust.arrival, w));
    }
    const started = !Number.isNaN(cust.start) && cust.start <= t;
    const departed = !Number.isNaN(cust.depart) && cust.depart <= t;
    const slot = cust.server >= 0 && cust.server < c ? cust.server : 0;

    if (departed) {
      served++;
      const di = intensity(t, cust.depart, w);
      if (di > 0) {
        sinkFlash = Math.max(sinkFlash, di);
        servers[slot].deliver = Math.max(servers[slot].deliver, di);
        transitsOut.push({ id: cust.id, server: slot, p: (t - cust.depart) / w });
      }
      continue;
    }
    if (started) {
      // in service at its slot
      servers[slot].customer = cust;
      const si = intensity(t, cust.start, w);
      if (si > 0) {
        servers[slot].recv = Math.max(servers[slot].recv, si);
        transitsIn.push({ id: cust.id, server: slot, p: (t - cust.start) / w });
      }
    } else if (cust.arrival <= t) {
      waiting.push(cust);
    }
  }

  return { t, arrived, served, waiting, servers, transitsIn, transitsOut, sourceFlash, sinkFlash };
}
