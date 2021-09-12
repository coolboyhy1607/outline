// @flow
const Koa = require("koa");
const Router = require("koa-router");
const router = new Router();
router.post("/a", async (ctx, next) => {
  console.log("a");
});
router.get("/b", async (ctx, next) => {
  ctx.body = "/b だよ";
});
router.get("/b/:id", async (ctx, next) => {
  ctx.body = `/b/${ctx.params.id} だよ`;
});
const app = new Koa();
app.use(router.routes());
app.listen(3001);
