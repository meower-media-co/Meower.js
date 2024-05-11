import Client from ".";
import { User as RawUser } from "./api/users";
import { Chat as RawChat } from "./api/chats";
import { APIResp, ErrorApiResp } from "./api";
import { Post as RawPost } from "./api/posts";

export class WrapperManager {
    private _client: Client;
    private _users: Map<string, User> = new Map();
    private _chats: Map<string, Chat> = new Map();
    private _posts: Map<string, Post> = new Map();


    constructor(client: Client) {
        this._client = client;
    }

    async getUser(username: string) {
        if (this._users.has(username)) 
            return this._users.get(username);
        

        const data = await this._client.api.users.get(username);
        if (data.body.error) return null;

        const user = new User(data.body, this._client);
        this._users.set(username, user);
        return user;        
    }

    async getChat(id: string) {
        if (this._chats.has(id))
            return this._chats.get(id);

        let data: ErrorApiResp<string> | (APIResp & RawChat);
        if (id !== "home")
            data = (await this._client.api.chats.getSingleChat(id)).body;
        else {
            data = {
              
                    _id: "home",
                    allow_pinning: false,
                    created: 0,
                    deleted: false,
                    icon: null,
                    icon_color: "000000",
                    last_active: 0,
                    members: [],
                    nickname: "Home",
                    owner: "Server",
                    type: 0,
                    error: false
                }
        }
            
        if (data.error) return null;

        const chat = new Chat(data, this._client);
        this._chats.set(id, chat);
        return chat;
    }

    async getPost(chatId: string, id: string) {
        if (this._posts.has(id))
            return this._posts.get(id);

        const data = await this._client.api.posts.getSinglePost(chatId, id);
        if (data.body.error) return null;

        const post = new Post(data.body as RawPost, this._client);
        this._posts.set(id, post);
        return post;
    }


}

export class Chat {
    id: string;
    nickname: string;
    created: number;
    last_active: number;
    owner: string;
    users: string[];
    private _client: Client;

    constructor(data: RawChat, _client: Client) {
        this.id = data._id;
        this.nickname = data.nickname;
        this.created = data.created;
        this.last_active = data.last_active;
        this.owner = data.owner;
        this.users = data.members;

        this._client = _client;
    }

    async send(content: string) {
        return await this._client.post(content, this.id);
    }

    async leave() {
        return await this._client.api.chats.leave(this.id);
    }

    async addMember(member: string) {
        return await this._client.api.chats.addMember(this.id, member);
    }
}

export class User {
    name: string;
    id: string;
    // Cut from avatar & pfp_data
    avatar_url: string;
    avatar_color: string;

    banned: boolean;
    created: number;
    experiments: number;
    flags: number;
    last_seen: number;
    permissions: number;
    quote: string;

    private _client: Client;

    constructor(data: RawUser, _client: Client) {

        this.name = data._id;
        this.id = data.uuid;
        
        

        let pfp;
        if (data.avatar !== "") {
            pfp = `https:/uploads.meower.org/icons/${data.avatar}`;
        } else {
            pfp = `https://raw.githubusercontent.com/3r1s-s/meo/main/images/avatars-webp/icon_${data.pfp_data}.webp`;
        }

        this.avatar_url = pfp;
        this.avatar_color = data.avatar_color;
        this.banned = data.banned;
        this.created = data.created;
        this.experiments = data.experiments;
        this.flags = data.flags;
        this.last_seen = data.last_seen;
        this.permissions = data.permissions;
        this.quote = data.quote;

        this._client = _client;        
    }

    
    async dm() {
        throw new Error("Not implemented");
    }
}

export class Post {
    id: string;
    content: string;
    created: number;
    user!: User;
    chat!: Chat;
    bridged: boolean;
    pinned: boolean;
    
    private _client: Client;
    private __raw: RawPost;
    constructor(data: RawPost, _client: Client) {
        data = _client.handleBridgedPost(data);

        this.id = data._id;
        this.content = data.p;
        this.created = data.t.e;
        this.bridged = data.bridged ? true : false;
        this.pinned = data.pinned;

        this._client = _client;
        this.__raw = data;
    }

    async finish() {
            const user = await this._client.data.getUser(this.__raw.u);
            if (!user) throw new Error("User not found");
            const chat = await this._client.data.getChat(this.__raw.post_origin);
            if (!chat) throw new Error("Chat not found");

            this.user = user; 
            this.chat = chat;
    }

    async delete() {
        return await this._client.api.posts.delete(this.id);
    }

    async pin() {
        return await this._client.api.posts.pin(this.id);
    }

    async unpin() {
        return await this._client.api.posts.unpin(this.id);
    }

    async reply(content: string) {
        let reply: string = "";

        const lines = this.content.split("\n");
        lines.forEach((line) => {
            // Check if above 3 quotes
            if (line.replaceAll(" ", "").startsWith(">>>")) {
               line = '<snip>';
            }    

            line = "> " + line;
            reply += line + "\n";
        });
        
        reply = `> @${this.user.name}\n` + reply;
        reply += "\n" + content;

        return await this.chat.send(reply);
        
    }


}