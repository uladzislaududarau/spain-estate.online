import { copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await copyFile(new URL('node_modules/libphonenumber-js/bundle/libphonenumber-min.js', root), new URL('showcase/assets/phone-library.js', root));
await copyFile(new URL('node_modules/libphonenumber-js/LICENSE', root), new URL('showcase/assets/phone-library.LICENSE', root));
