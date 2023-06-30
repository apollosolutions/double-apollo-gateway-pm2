# Double Apollo Gateway with PM2

Apollo Gateway processes the supergraph schema each time it updates, and that work is CPU-bound. This will block all inbound requests.

This repo experiments with running two Apollo Gateway processes, load balanced with PM2. A third process polls for supergraph updates and kills the processes one at a time to get them to restart.

**The code in this repository is experimental and has been provided for reference purposes only. Community feedback is welcome but this project may not be supported in the same way that repositories in the official [Apollo GraphQL GitHub organization](https://github.com/apollographql) are. If you need help you can file an issue on this repository, [contact Apollo](https://www.apollographql.com/contact-sales) to talk to an expert, or create a ticket directly in Apollo Studio.**

## Installation

```sh
yarn
export APOLLO_KEY=<your apollo key>
export APOLLO_GRAPH_REF=<your graph ref>
yarn pm2 start ecosystem.config.cjs
yarn pm2 logs -f
```

## Usage

Run a mock subgraph:

```sh
yarn subgraph
```

Start a load test

```sh
k6 run --no-connection-reuse --duration 60s k6.js
```

(K6 will aggressively reuse connections and the node HTTP server will never restart.)

Update your supergraph with `rover subgraph publish` and watch the logs to see the "leader" and "follower" gateway instances cycle.

```sh
yarn rover
```

You should see no downtime at [http://localhost:4000/](http://localhost:4000/) while that happens.

## Notes

- This setup complicates resource provisioning. You now need >2 CPUs for one server, since we're actually running two load balanced servers and an extra process for polling uplink. When the supergraph updates, one of the two processes will restart, so the remaining process needs enough throughput to handle all requests.
