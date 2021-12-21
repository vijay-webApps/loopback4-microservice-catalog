import {inject} from '@loopback/core';
import {
  ExpressRequestHandler,
  FindRoute,
  InvokeMethod,
  InvokeMiddleware,
  ParseParams,
  Reject,
  RequestContext,
  Send,
  SequenceActions,
  SequenceHandler,
} from '@loopback/rest';
import {AuthenticateFn, AuthenticationBindings} from 'loopback4-authentication';
import {Configuration, Provider} from 'oidc-provider';
import {User} from './models';

const config: Configuration = {
  cookies: {
    keys: ['test'],
  },
  clients: [
    {
      client_id: 'foo',
      redirect_uris: ['https://jwt.io'],
      response_types: ['id_token'],
      grant_types: ['implicit'],
      token_endpoint_auth_method: 'none',
      // ... other client properties
    },
  ],
  scopes: ['api'],
  claims: {
    profile: ['firstname', 'lastname'],
    scopeA: ['claim1', 'claim2'],
  },
  features: {
    devInteractions: {
      enabled: false,
    },
  },
  findAccount(ctx, sub, token) {
    return {
      accountId: sub,
      // @param use {string} - can either be "id_token" or "userinfo", depending on
      //   where the specific claims are intended to be put in
      // @param scope {string} - the intended scope, while oidc-provider will mask
      //   claims depending on the scope automatically you might want to skip
      //   loading some claims from external resources or through db projection etc. based on this
      //   detail or not return them in ID Tokens but only UserInfo and so on
      // @param claims {object} - the part of the claims authorization parameter for either
      //   "id_token" or "userinfo" (depends on the "use" param)
      // @param rejected {Array[String]} - claim names that were rejected by the end-user, you might
      //   want to skip loading some claims from external resources or through db projection
      async claims(use, scope, claims, rejected) {
        console.log('claims');
        return {sub: 'abcSub', claim1: 'w', firstname: 'test'};
      },
    };
  },
};
export const oidcProvider = new Provider('http://localhost:3000', config);
const middlewareList: ExpressRequestHandler[] = [oidcProvider.callback()];

export class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
    @inject(SequenceActions.INVOKE_MIDDLEWARE, {optional: true})
    protected invokeMiddleware: InvokeMiddleware = () => false,
    @inject(AuthenticationBindings.USER_AUTH_ACTION)
    protected authenticateRequest: AuthenticateFn<User>,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const route = this.findRoute(request);

      if (route.constructor.name === 'ExternalRoute') {
        this.invokeMiddleware(context, middlewareList);
        return;
      }

      const args = await this.parseParams(request, route);
      request.body = args[args.length - 1];
      await this.authenticateRequest(request);
      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (err) {
      this.reject(context, err as Error);
    }
  }
}
