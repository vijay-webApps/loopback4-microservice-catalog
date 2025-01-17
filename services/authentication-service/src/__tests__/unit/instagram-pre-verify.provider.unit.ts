import {expect} from '@loopback/testlab';
import sinon from 'sinon';
import {InstagramPreVerifyProvider} from '../../providers';

describe('Instagram Oauth Pre Verify Service', () => {
  let instagramPreVerifyProvider: InstagramPreVerifyProvider;

  afterEach(() => sinon.restore());
  beforeEach(setUp);

  const accessToken = 'test_access_token';
  const refreshToken = 'test_refresh_token';
  const profile = {
    id: 'test_id',
    displayName: 'test_display_name',
    username: 'test_user_name',
    name: {
      familyName: 'test_family_name',
      givenName: 'test_given_name',
    },
    _raw: 'test_raw',
    _json: 'test_json',
    provider: 'test_provider',
  };
  const user = null;

  describe('Pre Verify Service', () => {
    it('checks if provider returns a function', async () => {
      const result = instagramPreVerifyProvider.value();
      expect(result).to.be.Function();
    });

    it('checks if provider function returns a promise which is eql to user', async () => {
      const func = instagramPreVerifyProvider.value();
      const result = await func(accessToken, refreshToken, profile, user);
      expect(result).to.be.eql(user);
    });
  });

  function setUp() {
    instagramPreVerifyProvider = new InstagramPreVerifyProvider();
  }
});
