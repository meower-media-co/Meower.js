import { rest_api } from './rest.ts';
import { socket } from './socket.ts';

/** options used by the client to login */
export interface client_login_options {
	/** username */
	username: string;
	/** password or api token */
	password: string;
	/** api url */
	api_url: string;
	/** socket url */
	socket_url: string;
}

/** options used by the client to signup */
export interface client_signup_options extends client_login_options {
	/** captcha response key */
	captcha: string;
}

/** a meower api client written in typescript */
export class Client {
	/** access to the rest api */
	api: rest_api;
	/** access to websocket events */
	socket: socket;

	private constructor(api: rest_api, socket: socket) {
		this.api = api;
		this.socket = socket;
	}

	/** signup for an account and login */
	static async signup(
		opts: client_signup_options,
	): Promise<Client> {
		const rest = await rest_api.signup(
			opts.username,
			opts.password,
			opts.captcha,
			opts.api_url,
		);

		const ws = await socket.connect({ ...opts, api_token: rest.api_token });

		return new Client(rest, ws);
	}

	/** login to an account */
	static async login(opts: client_login_options): Promise<Client> {
		const rest = await rest_api.login(
			opts.username,
			opts.password,
			opts.api_url,
		);

		const ws = await socket.connect({ ...opts, api_token: rest.api_token });

		return new Client(rest, ws);
	}
}
