import { ApiError } from '../../../utils/index.js';
import { AUTH_PROVIDERS } from '../constants/providers.constants.js';
import { EmailPasswordStrategy } from './emailPassword.strategy.js';
import { MobileOtpStrategy } from './mobileOtp.strategy.js';
import { GoogleStrategy } from './google.strategy.js';
import { GithubStrategy } from './github.strategy.js';
import { LinkedinStrategy } from './linkedin.strategy.js';

const strategies = new Map([
  [AUTH_PROVIDERS.EMAIL, new EmailPasswordStrategy()],
  [AUTH_PROVIDERS.MOBILE_OTP, new MobileOtpStrategy()],
  [AUTH_PROVIDERS.GOOGLE, new GoogleStrategy()],
  [AUTH_PROVIDERS.GITHUB, new GithubStrategy()],
  [AUTH_PROVIDERS.LINKEDIN, new LinkedinStrategy()],
]);

export const AuthStrategyRegistry = {
  resolve(provider) {
    const strategy = strategies.get(provider);
    if (!strategy) {
      throw new ApiError(400, `Unsupported auth provider: ${provider}`);
    }
    return strategy;
  },

  supportedProviders() {
    return Array.from(strategies.keys());
  },
};
