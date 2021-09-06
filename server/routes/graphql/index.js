// @flow
import { buildSchema } from "graphql";
import Koa from "koa";
import graphqlHTTP from "koa-graphql";
import Router from "koa-router";

const graphql = new Koa();
const router = new Router();

const MyGraphQLSchema = buildSchema(`
    type Query {
    hello: String
    }
    `);

router.all(
  "/graphql",
  graphqlHTTP({
    schema: MyGraphQLSchema,
    graphiql: true,
  })
);

graphql.use(router.routes());

export default graphql;
