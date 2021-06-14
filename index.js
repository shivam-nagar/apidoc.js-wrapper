const RedisServer = require('redis-server');
const redis = require("redis");

const client = redis.createClient();
client.on("error", function (error) {
  console.error(error);

  console.log("Failed to connect to redis, attempting to start redis-server[:6379]");
  const server = new RedisServer(6379);
  server.open((err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("Started redis-server [localhost:6379]");
    }
  });
});

client.on("connect", () => {
  const app = require("./app");
  app.bootstrap();
})