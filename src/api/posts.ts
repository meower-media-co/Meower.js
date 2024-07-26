import mAPI, { APIResp, ErrorApiResp, PagedAPIResp } from ".";
import { Client } from "../"
import * as log from 'loglevel';

export interface Post {
    pinned: boolean;
    bridged?: Post;
    _id: string
    isDeleted: boolean,
    p: string
    post_id: string,
    post_origin: string,
    t: {
        d: string
        e: number, // epoch time (*seconds* (not milliseconds!) since January 1 1970)
        h: string,
        mi: string,
        mo: string,
        s: string, // second
        y: string // year
    },
    type: 1 | 2, // 2 for inbox messages, 1 for everything else
    u: string
}

export function isPost(obj: any): obj is Post {
    if (obj === null || typeof obj !== "object") return false;
    if (typeof obj._id !== "string")             return false;
    if (typeof obj.isDeleted !== "boolean")      return false;
    if (typeof obj.p !== "string")               return false;
    if (typeof obj.post_id !== "string")         return false;
    if (typeof obj.post_origin !== "string")     return false;
    if (typeof obj.t !== "object")               return false;
    if (obj.type !== 1 && obj.type !== 2)        return false;
    if (typeof obj.u !== "string")               return false;

    return true;
}

type GenericResp = {
    body: ErrorApiResp | APIResp;
    status: number;
};

export type PostResp = {
    body: ErrorApiResp | PagedAPIResp<Post> | APIResp & Post;
    status: number;
};

export default class MPosts {
    root: mAPI;
    client: Client;
    cache: Map<string, Map<string, Post> & {lastPage: number}> = new Map() as any;
    searchCache: Array<{time: number, posts: Array<Post>}> = [];

    constructor(root: mAPI) {
        this.root = root;
        this.client = this.root.client;
    }

    async getSinglePost(chatId: string, postId: string): Promise<{
        status: number,
        body: ErrorApiResp | Post & APIResp
    }> {
        if (this.cache.has(chatId) && this.cache.get(chatId)!.has(postId)) {
            return {
                status: 200,
                
                // @ts-expect-error: TODO
                body: this.cache.get(chatId)!.get(postId)!
            }
        }

        const request = await fetch(`${this.root.apiUrl}/posts/${postId}`, {
            method: "GET",
            headers: {
                token: this.client.user?.token
            }
        })

        const data: Post & APIResp = await request.json()
        if (!isPost(data)) {
            return {
                status: 500,
                body: {error: true}
            }
        }

        return {
            status: request.status,
            body: data
        }
    }


    async get(chatId: string, page: number = 1): Promise<{
        status: number,
        body: ErrorApiResp | PagedAPIResp<Post>
    }> {
        if (this.cache.has(chatId) && this.cache.get(chatId)!.lastPage >= page) {
            return {
                status: 200,
                body: {
                    error: false,
                    "page#": page,
                    page: page,
                    autoget: Array.from(this.cache.get(chatId)!.values())
                }
            }
        }

        const chatCache: Map<string, Post> & {lastPage: number} = new Map<string, Post>() as any;
        chatCache.lastPage = page;
        this.cache.set(chatId, chatCache);

        let url;

        if (chatId !== "home") {
            url = `posts/${chatId}`
        } else {
            url = "home"
        }

        url += `?autoget=1&page=${page || 1}`
        log.debug(`[Meower] Fetching posts from ${url}`)
        const request = await fetch(`${this.root.apiUrl}${url}`, {
            method: "GET",
            headers: {
                token: this.client.user?.token
            }
        })

        const data: PagedAPIResp<Post> = await request.json()

        data.autoget.forEach((post: Post) => {
            chatCache.set(post._id, post);
        });

        return {
            status: request.status,
            body: data
        }
    }

    async send(chatId: string, content: string): Promise<PostResp> {
        let url;
        if (chatId === "home" || !chatId) {
            url = "/home/";
        } else {
            url = "/posts/" + chatId;
        }

        const headers = {
            'Content-Type': 'application/json',
            'token': this.client.user.token
        };

        const response = await fetch(`${this.root.apiUrl}${url}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                'content': content
            })
        });

        if (!response.ok) {
            log.error(`[Meower] Failed to send post: ${response.status}`)
        }
        const data: PagedAPIResp<Post> = await response.json()
        if (!isPost(data)) {
            return {
                body: {error: true},
                status: 500
            }
        }
        data.error = false;
        return {
            body: data,
            status: response.status,
        }

    }

    async delete(postId: string): Promise<GenericResp> {
        const resp = await fetch(`${this.root.apiUrl}/posts/?id=${postId}`, {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json',
                'token': this.client.user.token
            }
        })

        return {
            body: await resp.json(),
            status: resp.status
        }
    }

    async pin(postId: string): Promise<PostResp> {
        const resp = (await fetch(`${this.root.apiUrl}/posts/${postId}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'token': this.client.user.token
            }

        }))
        const data: PagedAPIResp<Post> = await resp.json()
        if (!isPost(data)) {
            return {
                body: {error: true},
                status: 500
            }
        }

        return {
            body: data,
            status: resp.status
        }
    }

    async unpin(postId: string): Promise<PostResp> {
        const resq = (await fetch(`${this.root.apiUrl}/posts/${postId}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'token': this.client.user.token
            }
        }))
        const data: ErrorApiResp | APIResp = await resq.json()

        if (!isPost(data)) {
            return {
                body: {error: true},
                status: 500
            }
        }

        return {
            body: data,
            status: resq.status
        }
    }
    
    async report(post_id: string, reason: string, comment: string) {
        await this.client.send({ // ugh
            cmd: "report",
            val: {
                id: post_id,
                type: 0,
                reason: reason,
                comment: comment
            }
        })
    }
    
    async search(query: string, page: number = 1): Promise<PostResp> {
        if (this.searchCache.length >= page && this.searchCache[page - 1]!.time > Date.now() - 1000 * 60 * 30) {
            return {
                body: {
                    error: false,
                    "page#": page,
                    page: page,
                    autoget: this.searchCache[page - 1]!.posts
                },
                status: 200
            }
        }


        
        const response = await fetch(`${this.root.apiUrl}/search/home/?autoget&q=${query}&page=${page}`, {
            method: 'GET',
            headers: {
                token: this.client.user.token
            },
        });

        const data = await response.json()
        if (!data.error) {
            this.searchCache[page - 1] = {time: Date.now(), posts: data.autoget}
        }

        return {
            status: response.status,
            body: data
        }
    }
}