import { type api_post, Post } from './post.ts';

/** chat types */
export enum chat_type {
	/** a chat */
	chat = 0,
	/** a dm */
	dm = 1,
}

/** raw chat data */
export interface api_chat {
	/** chat id */
	_id: string;
	/** whether pinning is allowed */
	allow_pinning: boolean;
	/** chat creation timestamp */
	created: number;
	/** whether the chat is deleted */
	deleted: boolean;
	/** chat icon */
	icon?: string;
	/** chat icon color */
	icon_color: string;
	/** last active timestamp */
	last_active: number;
	/** chat member usernames */
	members: string[];
	/** chat nickname */
	nickname: string;
	/** chat owner username */
	owner: string;
	/** chat type */
	type: chat_type;
}

/** chat construction options */
export interface chat_construction_opts {
	/** api url */
	api_url: string;
	/** api token */
	api_token: string;
	/** chat data */
	data: api_chat;
}

/** chat update options */
export interface chat_update_opts {
	/** chat nickname */
	nickname?: string;
	/** chat icon */
	icon?: string;
	/** chat icon color */
	icon_color?: string;
	/** whether pinning is allowed */
	allow_pinning?: boolean;
}

/** check if a value is a chat */
export function is_api_chat(obj: unknown): obj is api_chat {
	if (obj === null || typeof obj !== 'object') return false;
	if (!('_id' in obj) || typeof obj._id !== 'string') return false;
	if (!('allow_pinning' in obj) || typeof obj.allow_pinning !== 'boolean') {
		return false;
	}
	if (!('created' in obj) || typeof obj.created !== 'number') return false;
	if (!('deleted' in obj) || typeof obj.deleted !== 'boolean') return false;
	if (!('icon' in obj) || typeof obj.icon !== 'string') return false;
	if (!('icon_color' in obj) || typeof obj.icon_color !== 'string') {
		return false;
	}
	if (!('last_active' in obj) || typeof obj.last_active !== 'number') {
		return false;
	}
	if (!('members' in obj) || !Array.isArray(obj.members)) return false;
	if (!('nickname' in obj) || typeof obj.nickname !== 'string') return false;
	if (!('owner' in obj) || typeof obj.owner !== 'string') return false;
	if (!('type' in obj) || typeof obj.type !== 'number') return false;

	return true;
}

/** a chat on meower */
export class Chat {
	private api_url: string;
	private api_token: string;
	private raw: api_chat;
	/** chat id */
	id!: string;
	/** whether pinning is allowed */
	allow_pinning!: boolean;
	/** chat creation timestamp */
	created!: number;
	/** whether the chat is deleted */
	deleted!: boolean;
	/** chat icon */
	icon?: string;
	/** chat icon color */
	icon_color!: string;
	/** last active timestamp */
	last_active!: number;
	/** chat member usernames */
	members!: string[];
	/** chat nickname */
	nickname!: string;
	/** chat owner */
	owner!: string;
	/** chat type */
	type!: chat_type;

	constructor(opts: chat_construction_opts) {
		this.api_url = opts.api_url;
		this.api_token = opts.api_token;
		this.raw = opts.data;
		if (!is_api_chat(this.raw)) {
			throw new Error('data is not a chat', { cause: this.raw });
		}
		this.assign_data();
	}

	private assign_data(): void {
		this.id = this.raw._id;
		this.allow_pinning = this.raw.allow_pinning;
		this.created = this.raw.created;
		this.deleted = this.raw.deleted;
		this.icon = this.raw.icon;
		this.icon_color = this.raw.icon_color;
		this.last_active = this.raw.last_active;
		this.members = this.raw.members;
		this.nickname = this.raw.nickname;
		this.owner = this.raw.owner;
		this.type = this.raw.type;
	}

	/** leave the chat */
	async leave(): Promise<void> {
		const resp = await fetch(`${this.api_url}/chats/${this.id}`, {
			method: 'DELETE',
			headers: {
				token: this.api_token,
			},
		});

		if (!resp.ok) {
			throw new Error('failed to leave chat', {
				cause: await resp.json(),
			});
		}
	}

	/** update the chat */
	async update(options: chat_update_opts): Promise<void> {
		const resp = await fetch(`${this.api_url}/chats/${this.id}`, {
			method: 'PATCH',
			headers: {
				token: this.api_token,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				nickname: options.nickname ?? this.nickname,
				icon: options.icon ?? this.icon,
				icon_color: options.icon_color ?? this.icon_color,
				allow_pinning: options.allow_pinning ?? this.allow_pinning,
			}),
		});

		const data = await resp.json();

		if (resp.ok || !data.error) {
			if (!is_api_chat(data)) {
				throw new Error('response is not a chat', { cause: data });
			}
			this.raw = data;
			this.assign_data();
		} else {
			throw new Error('failed to update chat', { cause: data });
		}
	}

	/** add a user to the chat */
	async add_member(username: string): Promise<void> {
		const resp = await fetch(
			`${this.api_url}/chats/${this.id}/members/${username}`,
			{
				method: 'PUT',
				headers: {
					token: this.api_token,
				},
			},
		);

		if (!resp.ok) {
			throw new Error('failed to add member', {
				cause: await resp.json(),
			});
		}
	}

	/** remove a user from the chat */
	async remove_member(username: string): Promise<void> {
		const resp = await fetch(
			`${this.api_url}/chats/${this.id}/members/${username}`,
			{
				method: 'DELETE',
				headers: {
					token: this.api_token,
				},
			},
		);

		if (!resp.ok) {
			throw new Error('failed to remove member', {
				cause: await resp.json(),
			});
		}
	}

	/** transfer chat ownership */
	async transfer_ownership(username: string): Promise<void> {
		const resp = await fetch(
			`${this.api_url}/chats/${this.id}/members/${username}/transfer`,
			{
				method: 'POST',
				headers: {
					token: this.api_token,
				},
			},
		);

		const data = await resp.json();

		if (resp.ok || !data.error) {
			if (!is_api_chat(data)) {
				throw new Error('response is not a chat', { cause: data });
			}
			this.raw = data;
			this.assign_data();
		} else {
			throw new Error('failed to update chat ownership', { cause: data });
		}
	}

	/** send typing indicator */
	async send_typing_indicator(): Promise<void> {
		let url = `${this.api_url}/chats/${this.id}/typing`;
		if (this.id === 'home') url = `${this.api_url}/home/typing`;

		await fetch(url, {
			method: 'POST',
			headers: {
				token: this.api_token,
			},
		});
	}

	/** send a message */
	async send_message(content: string): Promise<Post> {
		let url = `${this.api_url}/posts/${this.id}`;
		if (this.id === 'home') url = `${this.api_url}/home`;

		const resp = await fetch(url, {
			method: 'POST',
			headers: {
				token: this.api_token,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				content,
			}),
		});

		const data = await resp.json();

		if (!resp.ok || data.error) {
			throw new Error('failed to send message', {
				cause: data,
			});
		}

		return new Post({
			data,
			api_url: this.api_url,
			api_token: this.api_token,
		});
	}

	/** search for posts in the chat */
	async search(query: string, page: number = 1): Promise<Post[]> {
		if (this.id !== 'home') {
			throw new Error('search is only available in home');
		}

		const resp = await fetch(
			`${this.api_url}/search/home/?autoget&q=${query}&page=${page}`,
			{
				method: 'GET',
				headers: {
					token: this.api_token,
				},
			},
		);

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to search', { cause: data });
		}

		return data.autoget.map((i: api_post) =>
			new Post({
				data: i,
				api_url: this.api_url,
				api_token: this.api_token,
			})
		);
	}

	/** get messages in the chat */
	async get_messages(page: number = 1): Promise<Post[]> {
		let url = `${this.api_url}/posts/${this.id}`;
		if (this.id === 'home') url = `${this.api_url}/home`;

		const resp = await fetch(`${url}?autoget=1&page=${page}`, {
			method: 'GET',
			headers: {
				token: this.api_token,
			},
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to fetch messages', { cause: data });
		}

		return data.autoget.map((i: api_post) =>
			new Post({
				data: i,
				api_url: this.api_url,
				api_token: this.api_token,
			})
		);
	}
}
