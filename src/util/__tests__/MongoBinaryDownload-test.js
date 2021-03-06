/* @flow */

import fs from 'fs';
import md5file from 'md5-file';
import MongoBinaryDownload from '../MongoBinaryDownload';

jest.mock('fs');
jest.mock('md5-file');

describe('MongoBinaryDownload', () => {
  afterEach(() => {
    delete process.env.MONGOMS_SKIP_MD5_CHECK;
  });

  it('checkMD5 attribute can be set via constructor parameter', () => {
    expect(new MongoBinaryDownload({ checkMD5: true }).checkMD5).toBe(true);
    expect(new MongoBinaryDownload({ checkMD5: false }).checkMD5).toBe(false);
  });

  it(`if checkMD5 input parameter is missing, then it checks 
MONGOMS_MD5_CHECK environment variable`, () => {
    expect(new MongoBinaryDownload({}).checkMD5).toBe(false);
    process.env.MONGOMS_MD5_CHECK = '1';
    expect(new MongoBinaryDownload({}).checkMD5).toBe(true);
  });

  it('should use direct download', async () => {
    process.env['yarn_https-proxy'] = '';
    process.env.yarn_proxy = '';
    process.env['npm_config_https-proxy'] = '';
    process.env.npm_config_proxy = '';
    process.env.https_proxy = '';
    process.env.http_proxy = '';

    const du = new MongoBinaryDownload({});
    // $FlowFixMe
    du.httpDownload = jest.fn();

    await du.download('https://fastdl.mongodb.org/osx/mongodb-osx-ssl-x86_64-3.6.3.tgz');
    expect(du.httpDownload).toHaveBeenCalledTimes(1);
    const callArg1 = du.httpDownload.mock.calls[0][0];
    expect(callArg1.agent).toBeUndefined();
  });

  it('should pick up proxy from env vars', async () => {
    process.env['yarn_https-proxy'] = 'http://user:pass@proxy:8080';

    const du = new MongoBinaryDownload({});
    // $FlowFixMe
    du.httpDownload = jest.fn();

    await du.download('https://fastdl.mongodb.org/osx/mongodb-osx-ssl-x86_64-3.6.3.tgz');
    expect(du.httpDownload).toHaveBeenCalledTimes(1);
    const callArg1 = du.httpDownload.mock.calls[0][0];
    expect(callArg1.agent).toBeDefined();
    expect(callArg1.agent.options.href).toBe('http://user:pass@proxy:8080/');
  });

  it(`makeMD5check returns true if md5 of downloaded mongoDBArchive is
the same as in the reference result`, () => {
    const someMd5 = 'md5';
    fs.readFileSync.mockImplementationOnce(() => `${someMd5} fileName`);
    md5file.sync.mockImplementationOnce(() => someMd5);
    const mongoDBArchivePath = '/some/path';
    const fileWithReferenceMd5 = '/another/path';
    const du = new MongoBinaryDownload({});
    // $FlowFixMe
    du.download = jest.fn(() => Promise.resolve(fileWithReferenceMd5));
    const urlToMongoDBArchivePath = 'some-url';
    du.checkMD5 = true;
    return du.makeMD5check(urlToMongoDBArchivePath, mongoDBArchivePath).then(res => {
      expect(res).toBe(true);
      expect(du.download).toBeCalledWith(urlToMongoDBArchivePath);
      expect(fs.readFileSync).toBeCalledWith(fileWithReferenceMd5);
      expect(md5file.sync).toBeCalledWith(mongoDBArchivePath);
    });
  });

  it(`makeMD5check throws an error if md5 of downloaded mongoDBArchive is NOT
  the same as in the reference result`, () => {
    fs.readFileSync.mockImplementationOnce(() => 'someMd5 fileName');
    md5file.sync.mockImplementationOnce(() => 'anotherMd5');
    const du = new MongoBinaryDownload({});
    du.checkMD5 = true;
    // $FlowFixMe
    du.download = jest.fn(() => Promise.resolve(''));
    expect(du.makeMD5check('', '')).rejects.toMatchInlineSnapshot(
      `[Error: MongoBinaryDownload: md5 check is failed]`
    );
  });

  it('false value of checkMD5 attribute disables makeMD5check validation', () => {
    expect.assertions(1);
    fs.readFileSync.mockImplementationOnce(() => 'someMd5 fileName');
    md5file.sync.mockImplementationOnce(() => 'anotherMd5');
    const du = new MongoBinaryDownload({});
    du.checkMD5 = false;
    return du.makeMD5check('', '').then(res => {
      expect(res).toBe(undefined);
    });
  });
});
