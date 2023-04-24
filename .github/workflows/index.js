
const {spawn} = require('child_process'),
    path = require('path'),
    fs = require('@anzerr/fs.promisify'),
    remove = require('@anzerr/fs.remove'),
    copy = require('@anzerr/fs.copy');

class Sync {

    static allow = [
        'redis',
        'mongodb',
        'mariadb',
        'postgresql',
        'nextcloud',
        'jellyseerr',
        'metube',
        'jellyfin',
        'sonarr',
        'lidarr',
        'radarr',
        'jackett',
        'unpackerr'
    ];

    static exec(c, o) {
        return new Promise((resolve) => {
            const cmd = spawn('sh', ['-c', c], o);
            let data = [];
            cmd.stdout.on('data', (d) => {
                if (!o || !o.silent) {
                    process.stdout.write(d);
                }
                data.push(d);
            });
            cmd.stderr.on('data', (d) => {
                process.stderr.write(d);
                data.push(d);
            });
            cmd.on('error', (e) => {
                e.options = o;
                throw e;
            });
            cmd.on('close', (code) => {
                resolve({code, data: Buffer.concat(data).toString()});
            });
        });
    }

    static async loadCatalog() {
        await remove('../../catalog.json');
        await copy('upstream/catalog.json', '../../catalog.json');
        return JSON.parse((await fs.readFile('upstream/catalog.json')).toString());
    }

    static async run() {
        try {
            await remove('upstream');
            await this.exec('git clone https://github.com/truecharts/catalog.git upstream');
            const list = {
                'dependency': true,
                'enterprise': true,
                'incubator': true,
                'stable': true,
                '.helmdocsignore': false,
                'README.md': false,
                'features_capability.json': false
            };
            const catalog = await this.loadCatalog();
            for (const i in list) {
                if (list[i]) {
                    const cleanUp = await fs.readdir(path.join('upstream', i));
                    for (const x in cleanUp) {
                        if (!this.allow.includes(cleanUp[x])) {
                            await remove(path.join('upstream', i, cleanUp[x]));
                            delete catalog[i][cleanUp[x]];
                        }
                    }
                }
                await remove(path.join('../../', i));
                await copy(path.join('upstream', i), path.join('../../', i));
            }
            catalog.dev = {};
            await fs.writeFile('../../catalog.json', JSON.stringify(catalog, null, '\t'));
        } catch (e) {
            console.log(e);
        }
    }

}

Sync.run();
