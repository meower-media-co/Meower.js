import * as mf from 'https://deno.land/x/mock_fetch@0.3.0/mod.ts';
import * as mjs from '../src/index.ts';
import { assertEquals } from 'jsr:@std/assert';
import { checkChatEqual, checkIfUser, checkPostEqual } from './lib/assert.ts';

const user = new mjs.User({
	api_url: 'https://api.meower.org',
	api_token: 'token',
	data: {
		_id: '123',
		avatar: 'avatar.jpg',
		avatar_color: 'blue',
		banned: false,
		created: 1,
		flags: 0,
		last_seen: 0,
		lower_username: '',
		lvl: 0,
		permissions: 0,
		pfp_data: 0,
		quote: '',
		uuid: '',
	},
});

mf.install();

Deno.test('user.report', async () => {
	const user_report_options: mjs.user_report_options = {
		reason: 'reason',
		comment: 'comment',
	};

	mf.mock('POST@/users/:id/report', async (req, match) => {
		assertEquals(req.headers.get('token'), 'token');
		assertEquals(match.id, user.id);
		const body = await req.json();
		assertEquals(body, user_report_options);
		return new Response(null, { status: 200 });
	});

	await user.report(user_report_options);
	mf.reset();
});

Deno.test('user.change_relationship', async () => {
	const user_relationship_status: mjs.user_relationship_status = 2;

	mf.mock('POST@/users/:id/relationship', async (req, match) => {
		assertEquals(req.headers.get('token'), 'token');
		assertEquals(match.id, user.id);
		const body = await req.json();
		assertEquals(body, { type: user_relationship_status });
		return new Response(null, { status: 200 });
	});

	await user.change_relationship(user_relationship_status);
	mf.reset();
});

Deno.test('user.get_posts', async () => {
	const posts: mjs.api_post[] = [
		{
			_id: '123',
			p: 'content',
			t: { e: 0 },
			type: 1,
			u: 'username',
			pinned: false,
			isDeleted: false,
			post_id: '',
			post_origin: '',
		},
	];

	mf.mock('GET@/users/:id/posts', async (req, match) => {
		assertEquals(req.headers.get('token'), 'token');
		assertEquals(match.id, user.id);
		return Response.json({ autoget: posts, error: false }, { status: 200 });
	});

	const ret = await user.get_posts();
	assertEquals(ret.length, 1);
	checkPostEqual(ret[0], posts[0]);
	mf.reset();
});
