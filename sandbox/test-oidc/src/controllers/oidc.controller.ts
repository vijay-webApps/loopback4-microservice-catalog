// Uncomment these imports to begin using these cool features!

// import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {Getter, inject} from '@loopback/core';
import {
  get,
  post,
  requestBody,
  RequestContext,
  Response,
  RestBindings,
} from '@loopback/rest';
import ejs from 'ejs';
import {
  authenticate,
  AuthenticationBindings,
  STRATEGY,
} from 'loopback4-authentication';
import path from 'path';
import {User} from '../models';
import {oidcProvider} from '../sequence';

export class OidcController {
  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestContext: RequestContext,
  ) {}
  @get('/interaction/{uid}', {
    responses: {
      '200': {
        description: 'login page',
        content: {
          type: 'text/html',
        },
      },
    },
  })
  async interaction() {
    const {uid, prompt, params, session} =
      await oidcProvider.interactionDetails(
        this.requestContext.request,
        this.requestContext.response,
      );
    const client = await oidcProvider.Client.find(params.client_id as string);

    // console.log(uid, prompt, params, session);
    console.log(prompt);
    switch (prompt.name) {
      case 'login': {
        const html = await ejs.renderFile(
          path.join(__dirname, '../../public/views/login.ejs'),
          {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Sign-in',
          },
        );
        this.requestContext.response
          .status(200)
          .contentType('text/html')
          .send(html);
        return;
      }
      case 'consent': {
        const html = await ejs.renderFile(
          path.join(__dirname, '../../public/views/interaction.ejs'),
          {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Authorize',
          },
        );
        this.requestContext.response
          .status(200)
          .contentType('text/html')
          .send(html);
        return;
      }
      default:
        return undefined;
    }
  }
  @authenticate(STRATEGY.LOCAL)
  @post('/interaction/{uid}/login')
  async login(
    @requestBody({
      content: {
        'application/x-www-form-urlencoded': {},
      },
    })
    _requestBody: {
      username: string;
      password: string;
    },
    @inject.getter(AuthenticationBindings.CURRENT_USER)
    getCurrentUser: Getter<User>,
    @inject(RestBindings.Http.RESPONSE) response2: Response,
  ) {
    //authenticated user enters
    try {
      const currentUser = await getCurrentUser().then(user => user);
      const result = {
        login: {
          accountId: currentUser.username,
        },
      };
      await oidcProvider.interactionFinished(
        this.requestContext.request,
        this.requestContext.response,
        result,
      );
    } catch {
      throw new Error('Something went wrong');
    }
  }

  @post('/interaction/{uid}/confirm')
  async confirm() {
    const interactionDetails = await oidcProvider.interactionDetails(
      this.requestContext.request,
      this.requestContext.response,
    );

    let {grantId} = interactionDetails;

    const {
      prompt: {name, details},
      params,
    } = interactionDetails;

    let grant;
    if (grantId) {
      // we'll be modifying existing grant in existing session
      grant = await oidcProvider.Grant.find(grantId);
    } else {
      // we're establishing a new grant
      const accountId = interactionDetails.session?.accountId;
      grant = new oidcProvider.Grant({
        accountId,
        clientId: params.client_id as string,
      });
    }
    // console.log(interactionDetails.prompt.details);
    if (details.missingOIDCScope) {
      const scopesToAdd = (details.missingOIDCScope as Array<string>).join(' ');
      grant?.addOIDCScope(scopesToAdd);
      // console.log(grant?.getOIDCScope());
    }

    if (details.missingOIDCClaims) {
      grant?.addOIDCClaims(details.missingOIDCClaims as Array<string>);
    }
    console.log(grant);
    grantId = await grant?.save();
    // console.log(grantId);

    let consent: {grantId?: string} = {};

    if (!interactionDetails.grantId) {
      consent.grantId = grantId;
      console.log('hereee');
    }

    const result = {consent};
    console.log(result);
    await oidcProvider.interactionFinished(
      this.requestContext.request,
      this.requestContext.response,
      result,
      {mergeWithLastSubmission: true},
    );
  }
}
