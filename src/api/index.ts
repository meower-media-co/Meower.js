import Client, { Packet } from "../";
import MChats from "./chats";
import MPosts from "./posts";
import MUsers from "./users";

export interface Config {
    apiUrl: string,
    client: Client
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type RetType<T extends (...args: any[]) => any> = UnwrapPromise<ReturnType<T>>


export interface APIResp {
    error: false
}

export interface PagedAPIResp<T> extends APIResp {
    "page#": number,
    page: number,
    autoget: Array<T>
}

export interface ErrorApiResp<T = string>{
    error: true,
    type?: T,
}


type Stats = {
    users: number;
    posts: number;
    chats: number;
} & object;

type Status = {
    scratchDeprecated: boolean;
    registrationEnabled: boolean;
    isRepairMode: boolean;
    ipBlocked: boolean;
    ipRegistrationBlocked: boolean;
};

export default class mAPI {
    apiUrl!: string;
    client: Client;
    posts: MPosts;
    chats: MChats;
    users: MUsers;

    constructor(config: Config) {
        this.setUrl(config.apiUrl);
        this.client = config.client;
        this.posts = new MPosts(this);
        this.chats = new MChats(this);
        this.users = new MUsers(this);
    }

    setUrl(url: string) {
        this.apiUrl = url.endsWith('/') ? url : url + "/";
    }

    async getStatus(): Promise<Status> {

        const data: Status = await (await fetch(`${this.apiUrl}/status`)).json()

        const checkType: (keyof Status)[] = [
            "scratchDeprecated", 
            "registrationEnabled", 
            "isRepairMode", 
            "ipBlocked", 
            "ipRegistrationBlocked"
        ]

        for (const type of checkType) {
            if (typeof data[type] !== "boolean") {
                throw new Error("Invalid type")
            }
        }

        return data;
    }

    async getStatistics(): Promise<APIResp & Stats | ErrorApiResp> {
        const data: RetType<typeof this.getStatistics> = await (await fetch(`${this.apiUrl}/statistics`)).json();

        if (data.error) return data;

        const checkType: (keyof Stats)[] = ["users", "posts", "chats"]

        for (const type of checkType) {
            if (typeof data[type] !== "number") {
                return { error: true }
            }
        }

        return data;

    }

    /**
    * @description Sign up for an account. Disconnect after use.
    */
    signUp(username: string, password: string) {

        let re: () => void; let rj: (reason: any) => void;
        const promise = new Promise<void>((resolve, reject) => {re = resolve; rj = reject})

        this.client.connect();
        this.client.ws.on("open", () => {
            this.client.send({
                "cmd": "gen_account",
                val: {
                    username: username,
                    pswd: password
                },
                listener: "mb.js-login"
            })
        })

        this.client.on('listener-mb.js-login', (data: Packet) => {
            if (data.val === "I:100 | OK") re();
            if (data.cmd === "statuscode") rj(data.val);

        });

        return promise;
    }
}

