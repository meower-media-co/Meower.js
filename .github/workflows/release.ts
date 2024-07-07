import { copy, walk } from 'jsr:@std/fs@1.0.0-rc.3';

/** cleanup */

try {
	await Deno.remove('dist', { recursive: true });
} finally {
	await Deno.mkdir('dist');
}

/** install dependencies */

await (new Deno.Command('npm', {
	args: ['i', '-g', 'esbuild'],
})).output();

/** copy files */

await copy('src', 'dist/src');
await copy('README.md', 'dist/README.md');
await copy('LICENSE', 'dist/LICENSE');

/** build javascript */

await (new Deno.Command('npx', {
	args: [
		'esbuild',
		'./src/*',
		'./src/**/*',
		'--outdir=dist/dist',
		'--target=esnext',
		'--platform=node',
	],
})).output();

async function transformFile(path: string) {
	let content = await Deno.readTextFile(path);
	content = content.replaceAll('.ts', '.js');
	content = content.replace('jsr:@denosaurs/event@2.0.2', 'node:events');
	await Deno.writeTextFile(path, content);
}

for await (const { isDirectory, isFile, path } of walk('dist/dist')) {
	if (isFile) await transformFile(path);
	if (isDirectory) {
		for await (const { isFile, path: newpath } of walk(path)) {
			if (isFile) await transformFile(newpath);
		}
	}
}

/** copy metadata */

const { version } = JSON.parse(Deno.readTextFileSync('deno.json'));

const pkg = {
	'name': '@meower-media/meower',
	'version': version,
	'description': 'A Meower API Client written in Typescript',
	'type': 'module',
	'main': 'dist/index.js',
	'types': 'src/index.ts',
	'repository': {
		'type': 'git',
		'url': 'https://github.com/meower-media-co/meower.js',
	},
	'optionalDependencies': {
		'ws': '^8.13.0',
	},
	'scripts': {},
};

Deno.writeTextFileSync('dist/package.json', JSON.stringify(pkg, null, 2));
