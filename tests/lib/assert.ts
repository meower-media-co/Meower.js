import { assertEquals } from 'jsr:@std/assert/assert-equals';
import * as mjs from '../../src/index.ts';

export function checkChatEqual(ret: mjs.Chat, resp: mjs.api_chat) {
	assertEquals(ret.id, resp._id);
	assertEquals(ret.allow_pinning, resp.allow_pinning);
	assertEquals(ret.created, resp.created);
	assertEquals(ret.deleted, resp.deleted);
	assertEquals(ret.icon_color, resp.icon_color);
	assertEquals(ret.last_active, resp.last_active);
	assertEquals(ret.members, ret.members);
	assertEquals(ret.nickname, resp.nickname);
	assertEquals(ret.owner, resp.owner);
	assertEquals(ret.type, resp.type);
}

export function checkPostEqual(ret: mjs.Post, resp: mjs.api_post) {
	assertEquals(ret.id, resp._id);
	assertEquals(ret.pinned, resp.pinned);
	assertEquals(ret.content, resp.p);
	assertEquals(ret.timestamp, resp.t.e);
	assertEquals(ret.type, resp.type);
	assertEquals(ret.username, resp.u);
}

export function checkIfUser(ret: mjs.User, resp: mjs.api_user) {
	assertEquals(ret.uuid, resp.uuid);
	assertEquals(ret.permissions, resp.permissions);
	assertEquals(ret.quote, resp.quote);
	assertEquals(ret.username.toLowerCase(), resp.lower_username);
	assertEquals(ret.lvl, resp.lvl);
}
