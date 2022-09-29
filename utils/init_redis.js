const redis =  require("redis");

const client = redis.createClient({
  port: 6379,
  host: "127.0.0.1",
  legacyMode: true,
});


client.connect().then(() => {
   console.log("Connected to Redis 111");
})

 client.on("connect", async () => {
    console.log("Connected to Redis Client");
});

client.on("ready", async () => {
    console.log("Client Connected to Redis ready to use");
});

client.on("error", async (error) => {
    console.log("Redis Client Error");
});

client.on("end", async () => {
    console.log("Client Disconnected");
});

process.on('SIGINT', async () => {
    client.quit()
})

module.exports = client;




