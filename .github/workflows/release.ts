// TODO: make this work

/** install dependencies */

new Deno.Command('npm', {
	args: ['i', '-g', 'typescript'],
	stdin: 'inherit',
	stdout: 'inherit',
	stderr: 'inherit',
}).outputSync();

/** generate code */

try {
	Deno.removeSync('dist', { recursive: true });
} catch {
	console.log(`dist doesn't exist`);
}

Deno.mkdirSync('dist');

new Deno.Command('npx', {
	args: ['tsc', '-p', 'tsconfig.json'],
	stdin: 'inherit',
	stdout: 'inherit',
	stderr: 'inherit',
}).outputSync();

/** copy metadata */

const { version } = JSON.parse(Deno.readTextFileSync('deno.json'));

const pkg = {
	'name': '@meower-media/meower',
	'version': version,
	'description': 'A Meower API Client written in Typescript',
	'type': 'module',
	'main': 'index.js',
	'types': 'index.d.ts',
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

Deno.copyFileSync('README.md', 'dist/README.md');
Deno.copyFileSync('LICENSE', 'dist/LICENSE');
