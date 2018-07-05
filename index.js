/*!
 * Secrets
 * xiewulong <xiewulong@vip.qq.com>
 * create: 2018/07/04
 * since: 0.0.1
 */
'use strict';

const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_OPTIONS = {
  algorithm: 'aes-128-gcm',
  env_key: 'SECRETS_KEY',
  extname: '.enc',
  file: 'secrets.yml',
  git_ignore_file: '.gitignore',
  key_extname: '.key',
};

module.exports = class {

  constructor(options = {}) {
    Object.defineProperty(this, 'options', {
      configurable: false,
      enumerable: true,
      value: Object.assign({}, DEFAULT_OPTIONS, options),
      writable: false,
    });

    Object.defineProperties(this, {
      key: {
        configurable: false,
        enumerable: false,
        get() {
          if(!this._key) {
            this._key = process.env[this.options.env_key] || (fs.existsSync(this.key_path) && fs.readFileSync(this.key_path, {encoding: 'utf8'}) || null);
          }

          if(!this._key) {
            throw new Error(`Missing encryption key to decrypt secrets with. Ask your team for your secrets key and put it in process.env.${this.options.env_key}`);
          }

          return this._key;
        },
      },
      key_path: {
        configurable: false,
        enumerable: true,
        value: `${this.options.file}${this.options.key_extname}`,
        writable: false,
      },
      path: {
        configurable: false,
        enumerable: true,
        value: `${this.options.file}${this.options.extname}`,
        writable: false,
      },
    });
  }

  edit() {
    if(!process.env.EDITOR) {
      console.log('No process.env.EDITOR to open decrypted secrets in. Assign one like this:');
      console.log();
      console.log('EDITOR=vi secrets edit');
      console.log();
      console.log('For editors that fork and exit immediately, it\'s important to pass a wait flag,');
      console.log('otherwise the secrets will be saved immediately with no chance to edit.');

      return false;
    }

    if(!fs.existsSync(this.path)) {
      this.setup();
    }

    let basename = path.basename(this.path, this.options.extname);
    let temp_path = this.path.replace(basename, `.${basename}.${crypto.randomBytes(8).toString('hex')}`);
    fs.writeFileSync(temp_path, this.read());

    try {
      child_process.spawnSync(process.env.EDITOR, [temp_path], {stdio: 'inherit'});

      let cipher = crypto.createCipheriv(this.options.algorithm, this.key.slice(0, 16), this.key.slice(16));
      fs.writeFileSync(this.path, cipher.update(fs.readFileSync(temp_path, {encoding: 'utf8'}), 'utf8', 'hex') + cipher.final('hex'));
      fs.unlinkSync(temp_path);
    } catch(e) {
      fs.unlinkSync(temp_path);
      throw new Error(e);
    }
  }

  read() {
    if(!fs.existsSync(this.path)) {
      return '';
    }

    let decipher = crypto.createCipheriv(this.options.algorithm, this.key.slice(0, 16), this.key.slice(16));
    // let decipher = crypto.createDecipheriv(this.options.algorithm, this.key.slice(0, 16), this.key.slice(16));
    // decipher.setAuthTag(this.authTag);
    return decipher.update(fs.readFileSync(this.path, {encoding: 'utf8'}), 'hex', 'utf8') + decipher.final('utf8');
  }

  setup() {
    if(!fs.existsSync(this.path)) {
      this._key = crypto.randomBytes(16).toString('hex');
      fs.writeFileSync(this.key_path, this._key);
      fs.appendFileSync(this.options.git_ignore_file, `\n${this.key_path}\n`);

      let content = `# You can generating keys here.\n# production:\n#   external_api_key: ${crypto.randomBytes(20).toString('hex')}\n`;
      let cipher = crypto.createCipheriv(this.options.algorithm, this.key.slice(0, 16), this.key.slice(16));
      fs.writeFileSync(this.path, cipher.update(content, 'utf8', 'hex') + cipher.final('hex'));
      this.authTag = cipher.getAuthTag();

      console.log(`Adding ${this.key_path} to store the encryption key: ${this.key}`);
      console.log();
      console.log('Save this in a password manager your team can access.');
      console.log();
      console.log('If you lose the key, no one, including you, can access anything encrypted with it.');
      console.log();
      console.log(`      create  ${this.key_path}`);
      console.log();
      console.log(`Ignoring ${this.key_path} so it won't end up in Git history:`);
      console.log();
      console.log(`      append  ${this.options.git_ignore_file}`);
      console.log();
      console.log(`Adding ${this.path} to store secrets that needs to be encrypted.`);
      console.log();
      console.log('For now the file contains this but it\'s been encrypted with the generated key:');
      console.log();
      console.log(content);
      console.log();
    }

    console.log('Secrets has been setup.');
    console.log('You can edit encrypted secrets with `secrets edit`.');
    console.log();
  }

};
