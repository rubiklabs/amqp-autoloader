"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var amqplib_1 = __importDefault(require("amqplib"));
var events_1 = __importDefault(require("events"));
var uuid_1 = require("uuid");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var Server = /** @class */ (function () {
    function Server(options) {
        this.replyQueue = 'amq.rabbitmq.reply-to';
        this.connectionString = "amqp://".concat(options.amqp.user, ":").concat(options.amqp.password, "@").concat(options.amqp.host);
        this.serviceId = "".concat(options.serviceName, "-").concat((0, uuid_1.v4)());
        this.path = options.path;
        this.durable = options.amqp.durable;
        this.ackMode = options.amqp.ackMode;
        this.infoQueue = options.infoQueue;
        this.reply = options.amqp.reply;
    }
    Server.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createConnection()];
                    case 1:
                        _a.sent();
                        this.initConnectionEvent();
                        return [4 /*yield*/, this.createChannel()];
                    case 2:
                        _a.sent();
                        this.createServiceCommunicationProtocol();
                        if (this.reply) {
                            this.setReplyQueue();
                        }
                        this.consumeController();
                        return [2 /*return*/, this];
                }
            });
        });
    };
    Server.prototype.createConnection = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            amqplib_1.default.connect(_this.connectionString, function (err, connection) {
                if (err)
                    return reject(err);
                resolve(connection);
            });
        });
    };
    Server.prototype.initConnectionEvent = function () {
        var _this = this;
        this.connection.on("error", function (err) {
            console.log(err);
            setTimeout(_this.createConnection, 5000);
        });
        this.connection.on("close", function (err) {
            console.log(err);
            setTimeout(_this.createConnection, 5000);
        });
    };
    Server.prototype.createChannel = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connection.createChannel().then(function (channel) { return resolve(channel); }).catch(function (err) { return reject(err); });
        });
    };
    Server.prototype.setReplyQueue = function () {
        var _this = this;
        this.channel.prefetch(1);
        this.channel.responseEmitter = new events_1.default();
        this.channel.responseEmitter.setMaxListeners(0);
        this.channel.consume(this.replyQueue, function (msg) {
            _this.channel.responseEmitter.emit(msg === null || msg === void 0 ? void 0 : msg.properties.correlationId, (msg === null || msg === void 0 ? void 0 : msg.content) ? JSON.parse(msg.content.toString()) : null);
        }, { noAck: this.ackMode });
    };
    Server.prototype.createServiceCommunicationProtocol = function () {
        var _this = this;
        this.channel.consume(this.serviceId, function () {
            _this.publishServiceInfo();
        });
    };
    Server.prototype.publishServiceInfo = function () {
        var _this = this;
        fs_1.default.readdirSync(this.path).forEach(function (file) {
            if (!fs_1.default.existsSync(path_1.default.join(_this.path, file, "".concat(file, ".route.js"))) && !fs_1.default.existsSync(path_1.default.join(_this.path, file, "".concat(file, ".doc.js"))))
                return;
            var doc = require(path_1.default.join(_this.path, file, "".concat(file, ".doc")));
            var route = require(path_1.default.join(_this.path, file, "".concat(file, ".route")));
            _this.channel.sendToQueue(_this.infoQueue, Buffer.from(JSON.stringify({ route: route, doc: doc })));
        });
        return this;
    };
    Server.prototype.consumeController = function () {
        var _this = this;
        fs_1.default.readdirSync(this.path).forEach(function (file) {
            if (!fs_1.default.existsSync(path_1.default.join(_this.path, file, "".concat(file, ".route.js"))))
                return;
            var methods = require(path_1.default.join(_this.path, file, "".concat(file, ".controller")));
            Object.keys(methods).forEach(function (method) {
                _this.channel.assertQueue(method, { durable: _this.durable });
                _this.channel.consume(method, function (msg) { return __awaiter(_this, void 0, void 0, function () {
                    var content, reply, _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                if (!msg)
                                    return [2 /*return*/];
                                content = JSON.parse(msg.content.toString());
                                _b = (_a = JSON).stringify;
                                return [4 /*yield*/, methods[method](content)];
                            case 1:
                                reply = _b.apply(_a, [_c.sent()]);
                                this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(reply), { correlationId: msg.properties.correlationId });
                                this.channel.ack(msg);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
    };
    return Server;
}());
exports.default = Server;
