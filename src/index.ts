import EventEmitter from "events";
import mAPI, { PagedAPIResp } from "./api";
import WebSocket from './WSWrapper';
import * as log from 'loglevel';
import { Post } from "./api/posts";
import { Chat } from "./api/chats";
import { WrapperManager } from "./typeWrappers";


if (typeof window === "undefined" || window === null) {
    process.on('unhandledrejection', (event: { reason: undefined }) => {
        throw new Error(event.reason);
    })
} else {
    window.onunhandledrejection ? ((event: { reason: undefined }) => {
        throw new Error(event.reason);
    }) : undefined;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface Packet extends Object {
    cmd: string;
    val: any | object;
    listener?: string;
}



// eslint-disable-next-line @typescript-eslint/ban-types
interface User extends Object {
    account: {
        _id: string,
        active_dms: Array<Chat>
        avatar: string,
        avatar_color: string,
        ban: {
            expires: number,
            reason: string,
            restrictions: number,
            state: string
        },
        banned: boolean,
        bgm: false,
        bgm_song: number,
        created: number,
        debug: boolean,
        experiments: number,
        favorited_chats: Array<Chat>,
        flags: number,
        hide_blocked_users: boolean,
        last_seen: number,
        layout: string,
        lower_username: string,
        lvl: number,
        mode: boolean,
        permissions: number,
        pfp_data: number,
        quote: string,
        sfx: boolean,
        theme: string,
        unread_inbox: boolean,
        uuid: string,
    },
    relationships: Array<object>
    token: string,
    username: string,

    extra?: {
        chats: {
            [key: string]: Chat
        }
    }
}

export const bridges = ["Discord"]

export default class Client extends EventEmitter {
    ws!: WebSocket;
    user!: User;
    api: mAPI;
    server: string;
    apiUrl: string;
    data: WrapperManager;

    constructor(server = "wss://server.meower.org/", api = "https://api.meower.org") {
        super();

        this.server = server;
        this.apiUrl = api;

        this.api = new mAPI({
            client: this,
            apiUrl: api
        })

        this.data = new WrapperManager(this);


    }

    connect() {
        this.ws = new WebSocket(this.server);
        this.ws.on("open", () => {
            this.send({
                "cmd": "direct",
                "val": {
                    "cmd": "type",
                    "val": "js"
                }
            }); 
            
            setInterval(() => {
                if (this.ws.readyState == 1) {
                    this.send({
                        "cmd": "ping",
                        "val": ""
                    });
                }
            }, 10000);

            this.ws.on("close", () => {
                this.emit("close");
            });

            this.ws.on("message", (data: string) => {
                this.emit("packet", data);
            });

            this.on('command-direct', (command: Packet) => {
                command = JSON.parse(JSON.stringify(command))
                if (!Object.prototype.hasOwnProperty.call(command.val, "type")) {
                    return;
                }

                const post: Post = this.handleBridgedPost(command.val);

                this.emit("post",
                    post.u,
                    post.p,
                    post.post_origin,
                    { bridged: typeof command.val.bridged !== "undefined", raw: post }
                );
            })

            this.ws.on("message", (data: string) => {
                const packetData: Packet = JSON.parse(data);
                if (packetData.listener !== "mb.js-login") {
                    log.debug(`> ${data}`)
                }
                try {
                    if (packetData.listener !== undefined) {
                        this.emit(`listener-${packetData.listener}`, packetData)
                    }

                    this.emit(`command-${packetData.cmd}`, packetData)
                } catch (e) {
                    log.error(e);
                    this.emit('.error', e);

                }
            });
        });

    }

    /**
    * Connects to the (specified) server, then logs in
    */
    login(username: string | null, password: string | null) {
        this.connect();
        this.ws.on("connect", async () => {

            if (!username || !password) {
                this.emit("login");
                return;
            }
            this.send({
                "cmd": "direct",
                "val": {
                    "cmd": "authpswd",
                    "val": {
                        "username": username,
                        "pswd": password
                    }
                },
                "listener": "mb.js-login"
            });



            this.on('listener-mb.js-login', async (packet: Packet) => {
                log.debug("Got login packet!")
                if (packet.val.mode === undefined && packet.val !== "I:100 | OK") {
                    log.error(`[Meower] Failed to login: ${packet.val}`);
                    this.emit('.error', Error(`Failed to login: ${packet.val}`));
                    return;
                } else if (packet.val.mode === undefined) return;

                this.user = packet.val.payload;
                try {
                    const chats = Object.fromEntries(((await this.api.chats.get(1)).body as PagedAPIResp<Chat>).autoget.map((chat: Chat) => {
                        return [chat._id, chat];
                    }));
                    this.user.extra = { chats: chats };
                    this.emit("login");
                } catch (e) {
                    log.error(e);
                    this.emit('.error', e);
                }
            });

        })
    }

    handleBridgedPost(post: Post): Post {

        if (bridges.includes(post.u)) {
            post.bridged = JSON.parse(JSON.stringify(post));
            const data: Array<string> = (post.p).split(":");

            if (post.u === 'Webhooks') {
                data.splice(0, 1);
            }
            if (data.length < 1) {
                return post.bridged as Post;
            }

            post.u = data[0] as string;
            post.p = (data[1] as string).trimStart().concat(data.slice(2, data.length).join(":"));
            return post;
        }

        return post;
    }

    /**
    * Post to home, or a group chat, if specified
    */
    async post(content: string, id: string | null = null) {
        const resp = await this.api.posts.send(id ?? "home", content)
        if (resp.status !== 200)
            return null;

        return resp.body as Post;
    }

    /**
    * Executes the callback when a new post is sent

    */
    onPost(callback: (username: string, content: string, origin: string, { bridged, raw }: { bridged: boolean, raw: Post }) => void | Promise<void>) {
        this.on("post", async (username: string, content: string, origin: string, extra: { bridged: boolean, raw: Post }) => {
            await callback(username, content, origin, extra);
        });
    }

    /**
    * Executes the callback when the connection is closed
    */
    onClose(callback: () => void | Promise<void>) {
        this.on("close", async () => {
            await callback();
        });
    }


    /**
    * Executes the callback when a new packet from the server is sent
    */
    onPacket(callback: (data: Packet) => void | Promise<void>) {
        this.on("packet", async (data: Packet) => {
            await callback(data);
        });
    }


    /**
    * Executes the callback when successfully logged in
    */
    onLogin(callback: () => void | Promise<void>) {
        this.on("login", async () => {
            await callback();
        });
    }


    /**
    * Sends a packet to the server
    */
    async send(packet: Packet) {
        if (packet.listener !== "mb.js-login") {
            log.debug(`< ${JSON.stringify(packet)}`)
        }
        this.ws.send(JSON.stringify(packet));
    }

    /**
    * Closes the connection to the currently connected server
    */
    close() {
        this.off("close", () => {
            this.ws.close();
        });
    }

}

export { Client }
