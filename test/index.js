/*!
 * Test
 * xiewulong <xiewulong@vip.qq.com>
 * create: 2018/07/04
 * since: 0.0.2
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const Secrets = require('../');

const secrets = new Secrets;

describe(`secrets`, async () => {

  it(`setup`, async () => {
    secrets.setup();
    assert.equal(fs.existsSync(secrets.path) && fs.existsSync(secrets.key_path), true, `${secrets.path} or ${secrets.key_path} doesn't exists`);
  });

  it(`read`, async () => {
    assert.equal(!!secrets.read(), true, 'True');
  });

  it(`edit`, async () => {
    secrets.edit();
    assert.equal(!!secrets.read(), true, 'True');
  });

});
