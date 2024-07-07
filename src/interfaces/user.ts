import { type api_post, Post } from './post.ts';

/** raw user data */
export interface api_user {
	/** user id */
	_id: string;
	/** user avatar file id */
	avatar: string;
	/** user profile color */
	avatar_color: string;
	/** whether the user is banned */
	banned: boolean;
	/** user creation timestamp */
	created: number;
	/** user flags */
	flags: number;
	/** last seen timestamp */
	last_seen: number;
	/** username */
	lower_username: string;
	/** user level */
	lvl: number;
	/** user permissions */
	permissions: number;
	/** user profile picture number */
	pfp_data: number;
	/** user quote */
	quote: string;
	/** user uuid */
	uuid: string;
}

/** user construction options */
export interface user_construction_opts {
	/** api url */
	api_url: string;
	/** api token */
	api_token: string;
	/** user data */
	data: api_user;
}

/** user report options */
export interface user_report_options {
	/** the reason */
	reason: string;
	/** additional comments */
	comment: string;
}

/** user relationship status */
export enum user_relationship_status {
	/** no relationship */
	none = 0,
	/** that user is blocked */
	blocked = 2,
}

/** check if a value is a user */
export function is_api_user(obj: unknown): obj is api_user {
	if (obj === null || typeof obj !== 'object') return false;
	if (!('_id' in obj) || typeof obj._id !== 'string') return false;
	if (!('avatar' in obj) || typeof obj.avatar !== 'string') return false;
	if (!('avatar_color' in obj) || typeof obj.avatar_color !== 'string') {
		return false;
	}
	if (!('banned' in obj) || typeof obj.banned !== 'boolean') return false;
	if (!('created' in obj) || typeof obj.created !== 'number') return false;
	if (!('flags' in obj) || typeof obj.flags !== 'number') return false;
	if (!('last_seen' in obj) || typeof obj.last_seen !== 'number') {
		return false;
	}
	if (!('lower_username' in obj) || typeof obj.lower_username !== 'string') {
		return false;
	}
	if (!('lvl' in obj) || typeof obj.lvl !== 'number') return false;
	if (!('permissions' in obj) || typeof obj.permissions !== 'number') {
		return false;
	}
	if (!('pfp_data' in obj) || typeof obj.pfp_data !== 'number') return false;
	if (!('quote' in obj) || typeof obj.quote !== 'string') return false;
	if (!('uuid' in obj) || typeof obj.uuid !== 'string') return false;
	return true;
}

/** a user on meower */
export class User {
	private api_url: string;
	private api_token: string;
	private raw: api_user;
	/** user id */
	id!: string;
	/** user avatar file id */
	avatar?: string;
	/** user profile color */
	profile_color!: string;
	/** whether the user is banned */
	banned!: boolean;
	/** user creation timestamp */
	created!: number;
	/** user flags */
	flags!: number;
	/** last seen timestamp */
	last_seen!: number;
	/** username */
	username!: string;
	/** user level */
	lvl!: number;
	/** user permissions */
	permissions!: number;
	/** user profile picture number */
	pfp_data!: number;
	/** user quote */
	quote!: string;
	/** user uuid */
	uuid!: string;

	constructor(opts: user_construction_opts) {
		this.api_url = opts.api_url;
		this.api_token = opts.api_token;
		this.raw = opts.data;
		if (!is_api_user(this.raw)) {
			throw new Error('data is not a user', { cause: this.raw });
		}
		this.assign_data();
	}

	private assign_data() {
		this.id = this.raw._id;
		this.avatar = this.raw.avatar ?? undefined;
		this.profile_color = this.raw.avatar_color;
		this.banned = this.raw.banned;
		this.created = this.raw.created;
		this.flags = this.raw.flags;
		this.last_seen = this.raw.last_seen;
		this.username = this.raw.lower_username;
		this.lvl = this.raw.lvl;
		this.permissions = this.raw.permissions;
		this.pfp_data = this.raw.pfp_data;
		this.quote = this.raw.quote;
		this.uuid = this.raw.uuid;
	}

	/** report the user */
	async report(opts: user_report_options) {
		const resp = await fetch(`${this.api_url}/users/${this.id}/report`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'token': this.api_token,
			},
			body: JSON.stringify(opts),
		});

		if (!resp.ok) {
			throw new Error('failed to report user', {
				cause: await resp.json(),
			});
		}
	}

	/** change the user's relationship with you */
	async change_relationship(state: user_relationship_status) {
		const resp = await fetch(
			`${this.api_url}/users/${this.id}/relationship`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'token': this.api_token,
				},
				body: JSON.stringify({ state }),
			},
		);

		if (!resp.ok) {
			throw new Error('failed to change relationship', {
				cause: await resp.json(),
			});
		}
	}

	/** get the user's posts */
	async get_posts(): Promise<Post[]> {
		const resp = await fetch(`${this.api_url}/users/${this.id}/posts`, {
			headers: { 'token': this.api_token },
		});

		const data = await resp.json();

		if (data.error) {
			throw new Error('failed to get user posts', { cause: data });
		}

		return data.autoget.map((i: api_post) =>
			new Post({ data: i, api_url: this.api_url, api_token: this.api_token })
		);
	}
}
