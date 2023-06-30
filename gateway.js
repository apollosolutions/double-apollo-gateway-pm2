import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloGateway, UplinkSupergraphManager } from "@apollo/gateway";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { z } from "zod";

const envSchema = z.object({
  APOLLO_KEY: z.string(),
  APOLLO_GRAPH_REF: z.string(),
  PORT: z.string(),
  NAME: z.enum(["leader", "follower"]),
});

const env = envSchema.parse(process.env);

// @ts-ignore
class NonPollingUplinkSupergraphManager extends UplinkSupergraphManager {
  beginPolling() {
    // do nothing
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new NonPollingUplinkSupergraphManager({
    apiKey: env.APOLLO_KEY,
    graphRef: env.APOLLO_GRAPH_REF,
  }),
});

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer({
  gateway,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          schemaDidLoadOrUpdate() {
            console.log("SEND READY");
            process.send?.("ready");
          },
        };
      },
    },
  ],
});
await server.start();

app.use("/", cors(), bodyParser.json(), expressMiddleware(server));

await new Promise((resolve) =>
  httpServer.listen({ port: parseInt(env.PORT) }, () => resolve(httpServer))
);
console.log(`🚀 Gateway ready at http://localhost:${env.PORT}`);

process.on("SIGINT", async () => {
  console.log("SIGINT");
  await server.stop();
  console.log("apollo server stopped");
  httpServer.close(() => {
    console.log("http server closed");
    process.exit(0);
  });
});
