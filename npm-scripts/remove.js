const sh = require('shelljs');

const args = process.argv.slice(2);

/**
 * @param {String} path 
 */
const processPath = path => path.endsWith('/') ? path.slice(0, path.lastIndexOf('/')) : path;

/**
 * @param {String} path 
 */
const getParentPath = path => path.endsWith('/') ? path + '..' : path + '/..';


const parseArgs = args => {
    const parse = {
        SOURCE: arg => processPath(arg),
        DESTINATION: arg => processPath(arg),
        IGRORED: arg => arg.split(','),
    };
    
    /**
     * @param {String} arg 
     */
    const isSwitch = arg => arg.startsWith('-');
    
    let i = 0, source, dest, ignored = [], wasSwitchUsed;
    while (i < args.length) {
        const arg = args[i];
        if (isSwitch(arg)) {
            wasSwitchUsed = true;
            if (['-s', '--source'].includes(arg)) {
                source = parse.SOURCE(args[i + 1]);
            } else if (['-d', '--dest'].includes(arg)) {
                dest = parse.DESTINATION(args[i + 1]);
            } else if (['-i', '--ignore'].includes(arg)) {
                ignored = parse.IGRORED(args[i + 1]);
            }
            i += 2;
        } else if (!wasSwitchUsed) {
            if (i === 0) {
                source = parse.SOURCE(arg);
            } else if (i === 1) {
                dest = parse.DESTINATION(arg);
            } else if (i === 2) {
                ignored = parse.IGRORED(arg);
            }
            i++;
        } else {
            throw new Error('Invalid args', {args});
        }
    }

    if (!source) {
        throw new Error('Source path should not be empty');
    }
    
    return {
        source,
        destination: dest || getParentPath(source),
        ignored,
    };
};

const {
    source: sourcePath,
    destination: destinationPath,
    ignored
} = parseArgs(args);

if (!sourcePath) {
    throw new Error('Source path should not be empty.');
}

if (!sh.test('-d', sourcePath)) {
    return;
}

if (!sh.test('-d', destinationPath)) {
    throw new Error('Destination path is not a directory.');
}

sh.ls(sourcePath).forEach(file => {
    if (!ignored.includes(file)) {
        const sourceFile = [sourcePath, file].join('/');
        const destinationFile = [destinationPath, file].join('/');

        if (sh.test('-e', sourceFile) && sh.test('-e', destinationFile)) {
            sh.rm('-rf', destinationFile);
        }
    }
});