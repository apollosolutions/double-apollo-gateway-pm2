import pm2 from "pm2";

export async function connect() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => (err ? reject(err) : resolve(pm2)));
  });
}

export async function launchBus() {
  return new Promise((resolve, reject) => {
    pm2.launchBus((err, bus) => (err ? reject(err) : resolve(bus)));
  });
}

/**
 * @param {Awaited<ReturnType<typeof launchBus>>} bus
 * @param {{ from: string; to: string; }} parties
 * @param {(_: any) => void} fn
 */
export async function listenTo(bus, { from, to }, fn) {
  bus.on("process:msg", (/** @type {any} */ packet) => {
    if (packet.process.name === from && packet.data?.to === to) {
      fn(packet);
    }
  });
}

/**
 * @param {Awaited<ReturnType<typeof launchBus>>} bus
 * @param {{ from: string; }} parties
 * @param {(_: any) => void} fn
 */
export function listen(bus, { from }, fn) {
  bus.on("process:msg", (/** @type {any} */ packet) => {
    if (packet.process.name === from) {
      fn(packet);
    }
  });
}

/**
 * @param {string} to
 * @param {any} msg
 */
export function send(to, msg) {
  process.send?.({
    type: "process:msg",
    data: { to, msg },
  });
}
