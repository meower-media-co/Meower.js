import * as mf from "https://deno.land/x/mock_fetch@0.3.0/mod.ts";
import * as mjs from "../src/index.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertExists } from 'https://deno.land/std@0.224.0/assert/assert_exists.ts';



const config: mjs.api_construction_opts = {
    account: {
        _id: "123",
        avatar: "avatar.jpg",
        avatar_color: "blue",
        banned: false,
        created: 1,
        flags: 0,
        last_seen: 0,
        lower_username: "",
        lvl: 0,
        permissions: 0,
        pfp_data: 0,
        quote: '',
        uuid: ''
    },
    api_url: "https://localhost",
    token: "token"
}
mf.install();
const api = new mjs.rest_api(config)



function checkChatEqual(ret: mjs.Chat, resp: mjs.api_chat) {
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

function checkPostEqual(ret: mjs.Post, resp: mjs.api_post) {
    assertEquals(ret.id, resp._id);
    assertEquals(ret.pinned, resp.pinned);
    assertEquals(ret.content, resp.p);
    assertEquals(ret.timestamp, resp.t.e);
    assertEquals(ret.type, resp.type);
    assertEquals(ret.username, resp.u);
}

function checkIfUser(ret: mjs.User, resp: mjs.api_user) {
    assertEquals(ret.uuid, resp.uuid);
    assertEquals(ret.permissions, resp.permissions);
    assertEquals(ret.quote, resp.quote);
    assertEquals(ret.username.toLowerCase(), resp.lower_username);
    assertEquals(ret.lvl, resp.lvl);
}


Deno.test("get_chat", async () => {

    // @ts-expect-error: private
    api.chat_cache = new Map();

    const resp: mjs.api_chat = {
        "_id": "c25d26a2-348f-4ada-9079-14315fa4459f",
        "allow_pinning": false,
        "created": 1698452634,
        "deleted": false,
        "icon": "",
        "icon_color": "000000",
        "last_active": 1710192784,
        "members": [
            "ShowierData9978",
        ],
        "nickname": "BotHell",
        "owner": "ShowierData9978",
        "type": 0
    }


    mf.mock("GET@/chats/:id", (_req, params) => {
        assertEquals(_req.headers.get("token"), config.token)
        assertEquals(params["id"], resp._id)

        return Response.json({ ...resp, error: false }, {
            status: 200,
        })
    })
    let ret = await api.get_chat(resp._id)
    checkChatEqual(ret, resp);

    mf.reset()

    // caching check
    mf.mock("GET@/chats/:id", (_req, _params) => {
        throw new Error("Not meant to be called!")
    })

    ret = await api.get_chat(resp._id)
    checkChatEqual(ret, resp);

    mf.reset()
})

// TODO: Will fail until the chat pages become a Number[]
Deno.test("get_chat_page", async () => {
    // @ts-expect-error: private
    api.chat_cache = new Map();


    const PAGE = 1
    const resp: {
        error: boolean,
        autoget: mjs.api_chat[]
    } = {
        error: false,
        autoget: [
            {
                "_id": "c25d26a2-348f-4ada-9079-14315fa4459f",
                "allow_pinning": false,
                "created": 1698452634,
                "deleted": false,
                "icon": "",
                "icon_color": "000000",
                "last_active": 1710192784,
                "members": [
                    "ShowierData9978",
                ],
                "nickname": "BotHell",
                "owner": "ShowierData9978",
                "type": 0
            }
        ]
    }

    mf.mock("GET@/chats", (_req, _params) => {
        assertEquals(_req.headers.get("token"), config.token)
        return Response.json(resp, {
            status: 200,
        })
    })

    let ret = await api.get_chat_page(PAGE)
    assertEquals(ret.length, 1)
    checkChatEqual(ret[0], resp.autoget[0])

    mf.reset()

    // caching check
    mf.mock("GET@/chats", (_req, _params) => {
        throw new Error("Not meant to be called!")
    })

    ret = await api.get_chat_page(PAGE)
    assertEquals(ret.length, 1)
    checkChatEqual(ret[0], resp.autoget[0])

    mf.reset()
})

Deno.test("create_chat", async () => {
    const resp: mjs.api_chat = {
        "_id": "c25d26a2-348f-4ada-9079-14315fa4459f",
        "allow_pinning": false,
        "created": 1698452634,
        "deleted": false,
        "icon": "",
        "icon_color": "000000",
        "last_active": 1710192784,
        "members": [
            "ShowierData9978",
        ],
        "nickname": "BotHell",
        "owner": "ShowierData9978",
        "type": 0
    }

    mf.mock("POST@/chats", async (_req, _params) => {
        assertEquals(_req.headers.get("token"), config.token)
        const body = JSON.parse(await _req.text() || "{}");

        assertEquals(body.nickname, "BotHell")
        assertEquals(body.allow_pinning, false)

        return Response.json({ ...resp, error: false }, {
            status: 200,
        })
    })

    const ret = await api.create_chat({ nickname: resp.nickname, allow_pinning: resp.allow_pinning })
    checkChatEqual(ret, resp)

})

Deno.test("get_post", async () => {
    const resp: mjs.api_post = {
        /** is the post pinned */
        pinned: false,
        /** post id */
        _id: "a",
        /** is the post deleted */
        isDeleted: false,
        /** post content */
        p: "a",
        /** post id */
        post_id: "a",
        /** post origin */
        post_origin: "a",
        /** timestamp */
        t: {
            /** unix epoch seconds */
            e: 1,
        },
        /** post type */
        type: 1,
        /** username */
        u: "a"
    }

    mf.mock("/posts/:id", (_req, params) => {
        assertEquals(_req.headers.get("token"), config.token)
        assertEquals(params["id"], resp.post_id)

        return Response.json({ ...resp, error: false }, {
            status: 200,
        })
    })

    let ret = await api.get_post(resp.post_id)
    checkPostEqual(ret, resp);
    mf.reset()

    // caching check
    mf.mock("GET@/posts/:id", (_req, _params) => {
        throw new Error("Not meant to be called!")
    })

    ret = await api.get_post(resp.post_id)
    assertEquals(ret.id, resp.post_id);

    mf.reset()
})

Deno.test("get_user", async () => {
    const resp: mjs.api_user = config.account;

    mf.mock("GET@/users/:id", (_req, params) => {
        assertEquals(_req.headers.get("token"), config.token)
        assertEquals(params["id"], resp._id)

        return Response.json({ ...resp, error: false }, {
            status: 200,
        })
    })

    let ret = await api.get_user(resp._id)
    checkIfUser(ret, resp);

    mf.reset()

    // caching check
    mf.mock("GET@/users/:id", (_req, _params) => {
        throw new Error("Not meant to be called!")
    })

    ret = await api.get_user(resp._id)
    checkIfUser(ret, resp);

    mf.reset()
})

Deno.test("search_users", async () => {
    const resp: {
        error: boolean,
        autoget: mjs.api_user[]
    } = {
        error: false,
        autoget: [config.account]
    }

    mf.mock("GET@/search/users/", (_req, _params) => {
        assertEquals(_req.headers.get("token"), config.token)
        const params = new URLSearchParams(_req.url.split("?")[1])
        console.log(params)
        assertEquals(params.get("q"), "a")
        assertEquals(params.get("page"), "1")
        assertExists(params.get("autoget"))
        return Response.json(resp, {
            status: 200,
        })
    })

    const ret = await api.search_users("a", 1)
    assertEquals(ret.length, 1)
    checkIfUser(ret[0], resp.autoget[0])

    mf.reset()
})

Deno.test("get_statistics", async () => {
    const resp: mjs.api_statistics & { error: boolean } = {
        users: 1,
        posts: 1,
        chats: 1,
        error: false
    }

    mf.mock("GET@/statistics", (_req, _params) => {
        assertEquals(_req.headers.get("token"), config.token)
        return Response.json({ ...resp, error: false }, {
            status: 200,
        })
    })

    const ret = await api.get_statistics()
    assertEquals(ret, resp)

    mf.reset()
})

