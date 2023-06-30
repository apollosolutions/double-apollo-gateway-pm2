import {
  RemoteGraphQLDataSource,
  UplinkSupergraphManager,
} from "@apollo/gateway";
import pm2 from "pm2";
import { createMachine, interpret } from "xstate";
import { connect, launchBus, listen, send } from "./pm2.js";
import { z } from "zod";

const envSchema = z.object({
  APOLLO_KEY: z.string(),
  APOLLO_GRAPH_REF: z.string(),
});

const env = envSchema.parse(process.env);

const machine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFcAOECGAXMAnAdLFhrlgJYB2UAxAJIBytAKrQIIAytAWgKIDaABgC6iUKgD2sMuXEVRIAB6IATAEZV+ABwCArNoBsAZgCcAFkPLlAdn0AaEAE9Ep0-lWGTp5YdMCLF-QBfQPs0TBwCCQAbKMoaAFUABQARViZ+YXkJKRk5JEVnPXxrY2MrAJcTYx17JwRVHWNi40NNfX0dZWqrLtNg0PRsPHwAYwcR2Kp2MAwIPGoAJR5WZIBNQRF87OkyWXklBHKrfF0y3QFVU2NlTWVaxAamrtb2zu7e-pAwoYIxibiAGLiGLiADu8yWK3WmS2kh2e3yByOJ0aVnOl2ut3uCFa+B0OgEmhMVmM+lUVlMOmCIRAFHEc3g+W+ESycNy+0QnXw5T8pwE+gEpgaqmxAFpTJp8C1DPpLGZVG1lGTPszhkQSOQqKycrs8qADqoBAJuYZeY1+YLhdiXPhZTYyS5VNYdEKVYMIvhopMoNr4XqCjiCXirlZDQTtNdDNbXHb2pchc7XTTVb9xt7prM8L72YjOdpuS71D1TEZyjVHA9GtzNFY9DojLplDpVG7wsM-t6gSDwbhs7qOQhNEHGkT8Z0bN5y3VTMcnfb43PC9TAkA */
  id: "updater",
  initial: "starting",
  predictableActionArguments: true,
  states: {
    starting: {
      on: {
        INITIALIZE: "polling",
      },
    },
    polling: {
      on: {
        UPDATE: "cyclingLeader",
      },
    },
    cyclingLeader: {
      on: {
        READY: "cyclingFollower",
      },
      entry: () => {
        send("leader", "killyourself");
        process.send?.({
          type: "process:msg",
          data: { to: "leader", msg: "killyourself" },
        });
      },
    },
    cyclingFollower: {
      on: {
        READY: "polling",
      },
      entry: () => {
        send("follower", "killyourself");
      },
    },
  },
});

const service = interpret(machine)
  .onTransition((state) => {
    console.log("TRANSITION", state.value);
  })
  .start();

await connect();
const bus = await launchBus();

listen(bus, { from: "leader" }, (packet) => {
  if (packet.raw === "ready") {
    service.send("READY");
  }
});

listen(bus, { from: "follower" }, (packet) => {
  if (packet.raw === "ready") {
    service.send("READY");
  }
});

const manager = new UplinkSupergraphManager({
  apiKey: env.APOLLO_KEY,
  graphRef: env.APOLLO_GRAPH_REF,
});

const { cleanup } = await manager.initialize({
  async update(_supergraphSdl) {
    service.send("UPDATE");
  },
  async healthCheck() {},
  getDataSource() {
    return new RemoteGraphQLDataSource();
  },
});
service.send("INITIALIZE");

process.on("SIGINT", () => {
  pm2.disconnect();
  cleanup().then(() => {
    process.exit(0);
  });
});
