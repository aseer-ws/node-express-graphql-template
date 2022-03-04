// eslint-disable-next-line no-unused-vars
import express, { Express } from 'express';
import 'whatwg-fetch';
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { connect } from '@database/index';
import { MutationRoot } from '@gql/mutations';
import { QueryRoot } from '@gql/queries';
import { SubscriptionRoot } from '@gql/subscriptions';
import authenticateToken from '@middleware/authenticate/index';
import { signInRoute, signUpRoute } from '@server/auth';
import { newCircuitBreaker } from '@services/circuitbreaker';
import { isLocalEnv, isTestEnv, logger, unless } from '@utils/index';
import { initQues } from '@utils/queue';
import axios from 'axios';
import bodyParser from 'body-parser';
import rTracer from 'cls-rtracer';
import cluster from 'cluster';
import cors from 'cors';
import dotenv from 'dotenv';
import { GraphQLSchema, execute, subscribe } from 'graphql';
import { useServer } from 'graphql-ws/lib/use/ws';
import { createServer } from 'http';
import multer from 'multer';
import os from 'os';
import 'source-map-support/register';
import { WebSocketServer } from 'ws';

const totalCPUs = os.cpus().length;

console.log('I have ', totalCPUs, ' CPUs1');

/** @type {Express} */
let app;

export const fetchFromGithub = async query =>
  axios.get(`https://api.github.com/search/repositories?q=${query}&per_page=2`);
const githubBreaker = newCircuitBreaker(fetchFromGithub, 'Github API is down');
export const init = async () => {
  // configure environment variables
  dotenv.config({ path: `.env.${process.env.ENVIRONMENT_NAME}` });

  // connect to database
  connect();

  // create the graphQL schema
  const schema = new GraphQLSchema({ query: QueryRoot, mutation: MutationRoot, subscription: SubscriptionRoot });

  if (!app) {
    app = express();
  }

  app.use(express.json());
  app.use(rTracer.expressMiddleware());
  app.use(cors());
  app.use(unless(authenticateToken, '/', '/sign-in', '/sign-up'));
  // app.use(
  //   '/graphql',
  //   graphqlHTTP({
  //     schema: schema,
  //     graphiql: true,
  //     customFormatErrorFn: e => {
  //       logger().info({ e });
  //       return e;
  //     }
  //   })
  // );

  const createBodyParsedRoutes = routeConfigs => {
    if (!routeConfigs.length) {
      return;
    }
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    const validate = configs => configs.every(({ path, handler, method }) => !!path && !!handler && !!method);
    try {
      if (validate(routeConfigs)) {
        routeConfigs.forEach(({ path, handler, method }) => app[method](path, multer().array(), handler));
      } else {
        throw new Error('Invalid route config');
      }
    } catch (error) {
      console.error(error);
    }
  };
  createBodyParsedRoutes([
    signUpRoute,
    signInRoute,
    {
      path: '/github',
      method: 'get',
      handler: async (req, res) => {
        const response = await githubBreaker.fire(req.query.repo);
        if (response.data) {
          return res.json({ data: response.data });
        } else {
          return res.status(424).json({ error: response });
        }
      }
    }
  ]);

  app.get('/', (req, res) => {
    const message = 'Service up and running!';
    logger().info(message);
    res.json(message);
  });

  /* istanbul ignore next */
  if (!isTestEnv()) {
    const httpServer = createServer(app);

    const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
    const serverCleanup = useServer({ schema, execute, subscribe }, wsServer);

    const server = new ApolloServer({
      schema,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await serverCleanup.dispose();
              }
            };
          }
        }
      ]
    });

    await server.start();
    server.applyMiddleware({ app });

    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => wsServer.close());
    });

    const PORT = 9000;
    httpServer.listen(PORT, () => {
      console.log(`Server is now running on http://localhost:${PORT}/graphql`);
    });
    initQues();
  }
};

logger().info({ ENV: process.env.NODE_ENV });

if (!isTestEnv() && !isLocalEnv() && cluster.isMaster) {
  console.log(`Number of CPUs is ${totalCPUs}`);
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < totalCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    console.log("Let's fork another worker!");
    cluster.fork();
  });
} else {
  init();
}

export { app };
