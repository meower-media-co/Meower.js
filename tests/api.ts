import mAPI, { APIResp } from '@meower-media/meower/dist/api/index';
import { User } from '@meower-media/meower/dist/api/users';

class FakeClient {

}

const API = new mAPI({
    apiUrl: "https://api.meower.org",
    // @ts-expect-error: client is required
    client: new FakeClient()
});


import assert from 'node:assert'
import { describe, it, mock } from 'node:test'
describe('user', () => {
    it('should fetch a user', async () => {
        const user = "MikeDev";
        const data: APIResp & User = {
            error: false,
            "_id": "MikeDEV",
            "lower_username": "mikedev",
            "uuid": "a887becf-fe1d-492a-92c3-e2af7d15db28",
            "created": 1649983115,
            "pfp_data": 26,
            "avatar": "",
            "avatar_color": "#000000",
            "quote": "🦆👋 Friendly neighborhood duck enthusiast. Owner of Meower!",
            "flags": 0,
            "permissions": 1,
            "lvl": 0,
            "banned": false,
            "last_seen": 1706574821,
            "experiments": 0
        }

        mock.method(global, 'fetch', async (url: string, settings: RequestInit) => {
            assert.strictEqual(url, `https://api.meower.org/users/${user}`)
            assert.deepStrictEqual(settings, {
                method: "GET",
            })

            return {
                   json: async (): Promise<APIResp & User>  => data,
                   status: 200
            };
        });

        const resp = await API.users.get(user);
        assert.deepStrictEqual(resp.body, data);
        assert.strictEqual(resp.status, 200);

    });

});