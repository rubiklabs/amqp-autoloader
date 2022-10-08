/// <reference types="node" />
import { Channel, Connection } from 'amqplib';
import EventEmitter from 'events';
declare type Modify<T, R> = Omit<T, keyof R> & R;
interface ServerOptions {
    amqp: {
        host: string;
        user: string;
        password: string;
        durable: boolean;
        ackMode: boolean;
        reply: boolean;
        vhost: string;
    };
    serviceName: string;
    path: string;
    infoQueue: string;
}
declare type EventEmitterChannel = Modify<Channel, {
    responseEmitter: EventEmitter;
}>;
declare class Server {
    private replyQueue;
    private connectionString;
    private serviceId;
    private path;
    private durable;
    connection: Connection;
    channel: EventEmitterChannel;
    private ackMode;
    private infoQueue;
    private reply;
    constructor(options: ServerOptions);
    setup(): Promise<this>;
    private createConnection;
    private initConnectionEvent;
    private createChannel;
    private setReplyQueue;
    private createServiceCommunicationProtocol;
    publishServiceInfo(): this | undefined;
    private consumeController;
}
export default Server;
