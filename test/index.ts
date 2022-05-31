import Server from "../src/Server";

(async () => {
  const server = new Server({
      amqp: {
        host: "127.0.0.1",
        user: "rubiklabs",
        password: "rubiklabs",
        durable: false,
        ackMode: true,
        reply: true,
        vhost: "rubiklabs"
      },
      serviceName: "authentication",
      path: "test/domains",
      infoQueue: "StatusTracker"
    });

  (await server.setup()).publishServiceInfo();
})()