"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqplib_1 = __importDefault(require("amqplib"));
const events_1 = __importDefault(require("events"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Server {
    replyQueue = 'amq.rabbitmq.reply-to';
    connectionString;
    serviceId;
    path;
    durable;
    connection;
    channel;
    ackMode;
    infoQueue;
    reply;
    constructor(options) {
        this.connectionString = `amqp://${options.amqp.user}:${options.amqp.password}@${options.amqp.host}/${options.amqp.vhost}`;
        this.serviceId = `${options.serviceName}-${(0, uuid_1.v4)()}`;
        this.path = options.path;
        this.durable = options.amqp.durable;
        this.ackMode = options.amqp.ackMode;
        this.infoQueue = options.infoQueue;
        this.reply = options.amqp.reply;
    }
    async setup() {
        this.connection = await this.createConnection();
        this.initConnectionEvent();
        this.channel = await this.createChannel();
        this.createServiceCommunicationProtocol();
        if (this.reply) {
            this.setReplyQueue();
        }
        this.consumeController();
        return this;
    }
    async createConnection() {
        return await amqplib_1.default.connect(this.connectionString);
    }
    initConnectionEvent() {
        this.connection.on("error", (err) => {
            console.log(err);
            setTimeout(this.createConnection, 5000);
        });
        this.connection.on("close", (err) => {
            console.log(err);
            setTimeout(this.createConnection, 5000);
        });
    }
    async createChannel() {
        return await this.connection.createChannel();
    }
    setReplyQueue() {
        this.channel.prefetch(1);
        this.channel.responseEmitter = new events_1.default();
        this.channel.responseEmitter.setMaxListeners(0);
        this.channel.consume(this.replyQueue, (msg) => {
            this.channel.responseEmitter.emit(msg?.properties.correlationId, msg?.content ? JSON.parse(msg.content.toString()) : null);
        }, { noAck: this.ackMode });
    }
    createServiceCommunicationProtocol() {
        this.channel.assertQueue(this.serviceId, {
            exclusive: true,
        });
        this.channel.consume(this.serviceId, () => {
            this.publishServiceInfo();
        });
    }
    publishServiceInfo() {
        if (!fs_1.default.existsSync(this.path))
            return;
        fs_1.default.readdirSync(this.path).forEach((file) => {
            if (!fs_1.default.existsSync(path_1.default.join(this.path, file, `${file}.route.js`)) && !fs_1.default.existsSync(path_1.default.join(this.path, file, `${file}.doc.js`)))
                return;
            const doc = require(path_1.default.join(this.path, file, `${file}.doc`));
            const route = require(path_1.default.join(this.path, file, `${file}.route`));
            this.channel.sendToQueue(this.infoQueue, Buffer.from(JSON.stringify({ route, doc })));
        });
        return this;
    }
    consumeController() {
        if (!fs_1.default.existsSync(this.path))
            return;
        fs_1.default.readdirSync(this.path).forEach((file) => {
            if (!fs_1.default.existsSync(path_1.default.join(this.path, file, `${file}.route.js`)))
                return;
            const methods = require(path_1.default.join(this.path, file, `${file}.controller`));
            Object.keys(methods).forEach((method) => {
                this.channel.assertQueue(method, { durable: this.durable });
                this.channel.consume(method, async (msg) => {
                    if (!msg)
                        return;
                    const content = JSON.parse(msg.content.toString());
                    const reply = JSON.stringify(await methods[method](content));
                    this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(reply), { correlationId: msg.properties.correlationId });
                    this.channel.ack(msg);
                });
            });
        });
    }
}
exports.default = Server;
