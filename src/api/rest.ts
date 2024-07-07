import {
	type api_chat,
	Chat,
	type chat_update_opts,
	is_api_chat,
} from '../interfaces/chat.ts';
import { type api_post, Post } from '../interfaces/post.ts';
import { type api_user, User } from '../interfaces/user.ts';

/** statistics related to the meower server */
export interface api_statistics {
	/** the number of users on meower */
	users: number;
	/** the number of posts on meower */
	posts: number;
	/** the number of chats on meower */
	chats: number;
}

/** rest api construction options */
export interface api_construction_opts {
	/** user account */
	account: api_user;
	/** api url */
	api_url: string;
	/** api token */
	token: string;
}

/** access to the meower rest api */
export class rest_api {
	/** the current user */
	api_user: User;
	/** the api url */
	api_url: string;
	/** the api token */
	api_token: string;
	private chat_cache = new Map<string, api_chat>();
	private post_cache = new Map<string, api_post>();
	private user_cache = new Map<string, api_user>();

	constructor(opts: api_construction_opts) {
		this.api_user = new User({
			api_token: opts.token,
			api_url: opts.api_url,
			data: opts.account,
		});
		this.api_url = opts.api_url;
		this.api_token = opts.token;

		this.chat_cache.set('home', {
			_id: 'home',
			allow_pinning: false,
			created: 0,
			deleted: false,
			icon: '',
			icon_color: '',
			last_active: 0,
			members: [],
			nickname: 'home',
			owner: '',
			type: 0,
		});

		this.chat_cache.set('livechat', {
			_id: 'livechat',
			allow_pinning: false,
			created: 0,
			deleted: false,
			icon: '',
			icon_color: '',
			last_active: 0,
			members: [],
			nickname: 'livechat',
			owner: '',
			type: 0,
		});
	}

	/** get a chat by id */
	async get_chat(id: string): Promise<Chat> {
		const cached = this.chat_cache.get(id);

		if (cached) {
			return new Chat({
				api_token: this.api_token,
				api_url: this.api_url,
				data: cached,
			});
		}

		const resp = await fetch(`${this.api_url}/chats/${id}`, {
			headers: {
				token: this.api_token,
			},
		});

		const data = await resp.json();

		if (data.error || !is_api_chat(data)) {
			throw new Error('failed to get chat', { cause: data });
		}

		this.chat_cache.set(id, data);

		return new Chat({
			api_token: this.api_token,
			api_url: this.api_url,
			data,
		});
	}

	/** get a list of chats */
	async get_chats(): Promise<Chat[]> {
		const resp = await fetch(`${this.api_url}/chats`, {
			headers: {
				token: this.api_token,
			},
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to fetch chats', { cause: data });
		}

		data.autoget.push(
			this.chat_cache.get('home'),
			this.chat_cache.get('livechat'),
		);

		return data.autoget.map((i: api_chat) =>
			new Chat({
				api_token: this.api_token,
				api_url: this.api_url,
				data: i,
			})
		);
	}

	/** create a chat */
	async create_chat(
		opts: chat_update_opts & { nickname: string; allow_pinning: boolean },
	): Promise<Chat> {
		const resp = await fetch(`${this.api_url}/chats`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				token: this.api_token,
			},
			body: JSON.stringify(opts),
		});

		const data = await resp.json();

		if (data.error || !is_api_chat(data)) {
			throw new Error('failed to create chat', { cause: data });
		}

		this.chat_cache.set(data._id, data);

		return new Chat({
			api_token: this.api_token,
			api_url: this.api_url,
			data,
		});
	}

	/** get a post by id */
	async get_post(id: string): Promise<Post> {
		const cached = this.post_cache.get(id);

		if (cached) {
			return new Post({
				api_token: this.api_token,
				api_url: this.api_url,
				data: cached,
			});
		}

		const resp = await fetch(`${this.api_url}/posts?id=${id}`, {
			headers: {
				token: this.api_token,
			},
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to get post', { cause: data });
		}

		this.post_cache.set(id, data);

		return new Post({
			api_token: this.api_token,
			api_url: this.api_url,
			data,
		});
	}

	/** get a user by id */
	async get_user(id: string): Promise<User> {
		const cached = this.user_cache.get(id);

		if (cached) {
			return new User({
				api_token: this.api_token,
				api_url: this.api_url,
				data: cached,
			});
		}

		const resp = await fetch(`${this.api_url}/users/${id}`, {
			headers: {
				token: this.api_token,
			},
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to get user', { cause: data });
		}

		this.user_cache.set(id, data);

		return new User({
			api_token: this.api_token,
			api_url: this.api_url,
			data,
		});
	}

	/** search for users */
	async search_users(query: string, page: number = 1): Promise<User[]> {
		const resp = await fetch(
			`${this.api_url}/search/users/?autoget&q=${query}&page=${page}`,
			{
				headers: {
					token: this.api_token,
				},
			},
		);

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to search users', { cause: data });
		}

		return data.autoget.map((i: api_user) =>
			new User({
				api_token: this.api_token,
				api_url: this.api_url,
				data: i,
			})
		);
	}

	/** get statistics about the server */
	async get_statistics(): Promise<api_statistics> {
		const resp = await fetch(`${this.api_url}/statistics`, {
			headers: {
				token: this.api_token,
			},
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to get statistics', { cause: data });
		}

		return data;
	}

	/** login to an account on meower */
	static async login(
		username: string,
		password: string,
		api_url: string,
	): Promise<rest_api> {
		const resp = await fetch(`${api_url}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password }),
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to login', { cause: data });
		}

		return new rest_api({ ...data, api_url });
	}

	/** signup for an account on meower */
	static async signup(
		username: string,
		password: string,
		captcha: string,
		api_url: string,
	): Promise<rest_api> {
		const resp = await fetch(`${api_url}/signup`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username,
				password,
				captcha,
			}),
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to signup', { cause: data });
		}

		return new rest_api({ ...data, api_url });
	}
}
