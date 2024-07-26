
import mAPI, { APIResp, ErrorApiResp, PagedAPIResp } from ".";
import { Client } from "../"
import { Icon } from "./uploads";

export interface Chat {
    _id: string,
    allow_pinning: boolean,
    created: number,
    deleted: boolean,
    icon: string | null,
    icon_color: string,
    last_active: number,
    members: Array<string>,
    nickname: string,
    owner: string,
    type: number
}

function _checkIfChat(obj: any): obj is Chat {
    if (obj === null || typeof obj !== "object") return false;
    if (typeof obj._id !== "string") return false;
    if (typeof obj.allow_pinning !== "boolean") return false;
    if (typeof obj.created !== "number") return false;
    if (typeof obj.deleted !== "boolean") return false;
    if (typeof obj.icon !== "string") return false;
    if (typeof obj.icon_color !== "string") return false;
    if (typeof obj.last_active !== "number") return false;
    if (!Array.isArray(obj.members)) return false;
    if (typeof obj.nickname !== "string") return false;
    if (typeof obj.owner !== "string") return false;
    if (typeof obj.type !== "number") return false;

    return true;
}

type ChatResp = {
    body: PagedAPIResp<Chat> | ErrorApiResp;
    status: number;
};

export default class MChats {

    root: mAPI;
    client: Client;
    cache: Map<string, Chat> & {lastPage: number} = new Map() as any;

    constructor(root: mAPI) {
        this.root = root;
        this.client = this.root.client;
    }
    async getSingleChat(id: string): Promise<{
        body: ErrorApiResp | Chat & APIResp,
        status: number
    }> {
        if (this.cache.has(id)) {
            return {
                // @ts-expect-error: TODO
                body: this.cache.get(id),
                status: 200
            }
        }

        const resp = await fetch(`${this.root.apiUrl}/chats/${id}`, {
            headers: { token: this.client.user.token }
        })

        const data = await resp.json()
        if (!data.error && !_checkIfChat(data)) {
            return {
                body: { error: true },
                status: 500
            }
        }

        this.cache.set(id, data)
        return {
            body: data,
            status: resp.status
        }
    }
    async get(page: number): Promise<ChatResp> {
        if (this.cache.lastPage >= page) {
            return {
                body: {
                    error: false,
                    "page#": page,
                    page: page,
                    autoget: Array.from(this.cache.values())
                },
                status: 200
            }
        }
        const resp = await fetch(`${this.root.apiUrl}/chats?autoget=1`, {
            headers: { token: this.client.user.token }
        })
        
        const data: PagedAPIResp<Chat> | ErrorApiResp = await resp.json()
        if (!data.error && !_checkIfChat(data.autoget[0])) {
            return {
                body: { error: true },
                status: 500
            }
        }
        return {
            body: data,
            status: resp.status
        }
    }

    async create(nickname: string, icon: Icon | undefined, allow_pinning: boolean = false): Promise<ErrorApiResp | (Chat & APIResp)> {
        const hexCode = icon?.color.toString(16) || "000000";
        if (hexCode.length < 6) {
            throw new Error("Invalid color code")
        }

        const resp = await fetch(`${this.root.apiUrl}/chats`, {
            method: "POST",
            headers: {
                token: this.client.user.token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nickname,
                icon: icon?.id || "",
                icon_color: hexCode,
                allow_pinning
            })
        })

        const data = await resp.json()
        if (!data.error && !_checkIfChat(data)) {
            return { error: true }
        }

        return data
    }
    async leave(chatId: string): Promise<number> {
        const resp = await fetch(`${this.root.apiUrl}/chats/${chatId}`, {
            method: "DELETE",
            headers: {
                token: this.client.user.token
            }
        })

        return resp.status
    }

    async update(chatId: string, nickname: string | undefined, icon: Icon | undefined, allow_pinning: boolean | undefined = false): Promise<{
        body: ErrorApiResp | (Chat & APIResp),
        status: number
    }> {
        let hexCode = null;
        let iconId = null;
        if (icon !== undefined) {
            hexCode = icon.color.toString(16);
            iconId = icon.id;
            if (hexCode.length < 6) {
                throw new Error("Invalid color code")
            }
        }

        const resp = await fetch(`${this.root.apiUrl}/chats/${chatId}`, {
            method: "PATCH",
            headers: {
                token: this.client.user.token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nickname: nickname === undefined ? null : nickname,
                icon: iconId,
                icon_color: hexCode === null ? null : hexCode,
                allow_pinning: allow_pinning === undefined ? null : allow_pinning
            })
        })
        
        const data = await resp.json()
        if (!data.error && !_checkIfChat(data)) {
            return {
                body: { error: true },
                status: 500
            }
        }

        return {
            body: data,
            status: resp.status
        }
    }

    async transferOwnership(chatId: string, userId: string): Promise<{
        body: ErrorApiResp | (Chat & APIResp),
        status: number
    }> {
        const resp = await fetch(`${this.root.apiUrl}/chats/${chatId}/members/${userId}/transfer`, {
            method: "POST",
            headers: {
                token: this.client.user.token,
            }
        })

        const data = await resp.json()
        if (!data.error && !_checkIfChat(data)) {
            return {
                body: { error: true },
                status: 500
            }
        }

        return {
            body: data,
            status: resp.status
        }
    }


    async addMember(chatId: string, userId: string): Promise<{
        body: ErrorApiResp | (Chat & APIResp),
        status: number
    }> {
        const resp = await fetch(`${this.root.apiUrl}/chats/${chatId}/members/${userId}`, {
            method: "PUT",
            headers: {
                token: this.client.user.token
            }
        })

        const data = await resp.json()
        if (!data.error && !_checkIfChat(data)) {
            return {
                body: { error: true },
                status: 500
            }
        }

        return {
            body: data,
            status: resp.status
        }
    }

    async removeMember(chatId: string, userId: string): Promise<{
        body: ErrorApiResp | (Chat & APIResp),
        status: number
    }> {
        const resp = await fetch(`${this.root.apiUrl}/chats/${chatId}/members/${userId}`, {
            method: "DELETE",
            headers: {
                token: this.client.user.token
            }
        })

        const data = await resp.json()
        if (!data.error && !_checkIfChat(data)) {
            return {
                body: { error: true },
                status: 500
            }
        }

        return {
            body: data,
            status: resp.status
        }
    }

    // this not being async is not important, as we don't need to wait for the server to respond
    send_typing_indicator(chatId: string) {
        let url = this.root.apiUrl;

        if (chatId !== "home") {
            url += `chats/${chatId}/typing`
        } else {
            url += "home/typing"
        }

        fetch(url, {
            method: "POST",
            headers: {
                token: this.client.user.token
            }
        })
    }
}