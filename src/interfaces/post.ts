/** types of posts */
export enum post_type {
	/** normal posts (home) */
	normal = 1,
	/** inbox posts */
	inbox = 2,
}

/** raw post data */
export interface api_post {
	/** is the post pinned */
	pinned: boolean;
	/** bridged post */
	bridged?: api_post;
	/** post id */
	_id: string;
	/** is the post deleted */
	isDeleted: boolean;
	/** post content */
	p: string;
	/** post id */
	post_id: string;
	/** post origin */
	post_origin: string;
	/** timestamp */
	t: {
		/** unix epoch seconds */
		e: number;
	};
	/** post type */
	type: post_type;
	/** username */
	u: string;
}

/** post creation options */
export interface post_construction_opts {
	/** api url */
	api_url: string;
	/** api token */
	api_token: string;
	/** post data */
	data: api_post;
}

/** post report options */
export interface post_report_options {
	/** the reason */
	reason: string;
	/** additional comments */
	comment: string;
}

/** check if a value is a post */
export function is_api_post(obj: unknown): obj is api_post {
	if (obj === null || typeof obj !== 'object') return false;
	if (!('pinned' in obj) || typeof obj.pinned !== 'boolean') return false;
	if (('bridged' in obj) && typeof obj.bridged !== 'object') return false;
	if (!('_id' in obj) || typeof obj._id !== 'string') return false;
	if (!('isDeleted' in obj) || typeof obj.isDeleted !== 'boolean') {
		return false;
	}
	if (!('p' in obj) || typeof obj.p !== 'string') return false;
	if (!('post_id' in obj) || typeof obj.post_id !== 'string') return false;
	if (!('post_origin' in obj) || typeof obj.post_origin !== 'string') {
		return false;
	}
	if (!('t' in obj) || typeof obj.t !== 'object' || obj.t === null) {
		return false;
	}
	if (!('e' in obj.t) || typeof obj.t.e !== 'number') return false;
	if (!('type' in obj) || typeof obj.type !== 'number') return false;
	if (!('u' in obj) || typeof obj.u !== 'string') return false;

	return true;
}

/** a post on meower */
export class Post {
	private api_url: string;
	private api_token: string;
	private raw: api_post;
	/** post id */
	id!: string;
	/** whether the post in pinned */
	pinned!: boolean;
	/** bridged post, if any */
	bridged?: Post;
	/** is the post deleted */
	deleted!: boolean;
	/** post content */
	content!: string;
	/** post origin */
	post_origin!: string;
	/** timestamp in epoch seconds */
	timestamp!: number;
	/** post type */
	type!: post_type;
	/** username */
	username!: string;

	constructor(opts: post_construction_opts) {
		this.api_url = opts.api_url;
		this.api_token = opts.api_token;
		this.raw = opts.data;
		if (!is_api_post(this.raw)) {
			throw new Error('data is not a post', { cause: this.raw });
		}
		this.assign_data();
	}

	private assign_data() {
		this.id = this.raw._id;
		this.pinned = this.raw.pinned;
		this.bridged = this.raw.bridged
			? new Post({
				api_token: this.api_token,
				api_url: this.api_url,
				data: this.raw.bridged,
			})
			: undefined;
		this.deleted = this.raw.isDeleted;
		this.content = this.raw.p;
		this.post_origin = this.raw.post_origin;
		this.timestamp = this.raw.t.e;
		this.type = this.raw.type;
		this.username = this.raw.u;
	}

	/** delete the post */
	async delete() {
		const resp = await fetch(`${this.api_url}/posts/?id=${this.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'token': this.api_token,
			},
		});

		if (!resp.ok) {
			throw new Error('failed to delete post', {
				cause: await resp.json(),
			});
		}
	}

	/** pin the post */
	async pin() {
		const resp = await fetch(`${this.api_url}/posts/${this.id}/pin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'token': this.api_token,
			},
		});

		const data = await resp.json();

		if (!resp.ok) {
			throw new Error('failed to pin post', {
				cause: data,
			});
		}

		this.raw = data;
		this.assign_data();
	}

	/** unpin the post */
	async unpin() {
		const resp = await fetch(`${this.api_url}/posts/${this.id}/pin`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'token': this.api_token,
			},
		});

		const data = await resp.json();

		if (!resp.ok) {
			throw new Error('failed to unpin post', {
				cause: data,
			});
		}

		this.raw = data;
		this.assign_data();
	}

	/** report the post */
	async report(opts: post_report_options) {
		const resp = await fetch(`${this.api_url}/posts/${this.id}/report`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'token': this.api_token,
			},
			body: JSON.stringify(opts),
		});

		if (!resp.ok) {
			throw new Error('failed to report post', {
				cause: await resp.json(),
			});
		}
	}
}
