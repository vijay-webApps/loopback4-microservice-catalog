import {Provider, inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {VonageEnums} from '../../enums/video-chat.enum';
import {MeetingOptions, SessionOptions} from '../../types';
import {VonageVideoChat, VonageConfig, VonageS3TargetOptions, VonageAzureTargetOptions} from './types';
import OpenTok from 'opentok';
import { VonageBindings } from './keys';
import { sign } from 'jsonwebtoken';
import moment from 'moment';
import axios from 'axios';

export class VonageProvider implements Provider<VonageVideoChat> {
  constructor(
    @inject(VonageBindings.config)
    private readonly vonageConfig: VonageConfig
  ) {
    const { apiKey, apiSecret } = vonageConfig;
    if (!(apiKey && apiSecret)) {
      throw new HttpErrors.BadRequest('Vonage API key or secret is not set');
    }
    this.VonageService = new OpenTok(apiKey, apiSecret);
  }

  VonageService: OpenTok;

  value() {
    return {
      getMeetingLink: async (options: MeetingOptions) => {
        return {
          mediaMode: VonageEnums.MediaMode.Routed,
          archiveMode: VonageEnums.ArchiveMode.Always,
          sessionId: 'dummy-session-id',
        };
      },
      getToken: async (options: SessionOptions) => {
        return {
          sessionId: 'dummy-session-id',
          token: 'first-token',
        };
      },
      stopMeeting: async (meetingId: string) => {},
      getArchives: async (archiveId: string | null) => {
        return {
          createdAt: 1234,
          duration: 1234,
          hasAudio: true,
          hasVideo: true,
          id: 'abc',
          name: 'rec-1',
          outputMode: VonageEnums.OutputMode.Composed,
          projectId: 123,
          reason: '',
          resolution: '',
          sessionId: 'session-1',
          size: 1,
          status: '',
          url: null,
        };
      },
      deleteArchive: async (archiveId: string) => {},
      setUploadTarget: async (config: VonageS3TargetOptions & VonageAzureTargetOptions): Promise<void> => {
        const { apiKey, apiSecret } = this.vonageConfig;
        const jwtPayload = {
            iss: apiKey,
            ist: 'project',
            iat: moment().unix(),
            exp: moment().add(200, 'seconds').unix(),
        };

        const token = sign(jwtPayload, apiSecret);
        let type: string = '';
        const credentials = {};
        const { accessKey , secretKey, bucket, endpoint,
         fallback, accountName, accountKey, container, domain } = config;
        if (accessKey && secretKey && bucket) {
          type = 'S3';
          Object.assign(credentials, {
            accessKey, secretKey, bucket, endpoint,
          });
        }
        if (accountName && accountKey && container) {
          type = 'Azure';
          Object.assign(credentials, {
            accountName, accountKey, container, domain
          });
        }
        await axios({
          url: `https://api.opentok.com/v2/project/${process.env.TOKBOX_API_KEY}/archive/storage`,
          method: 'put',
          data: {
           type,
           config: credentials,
           fallback,
          },
          headers: {
            'X-OPENTOK-AUTH': token
          }
        });

        }
      }
    };
  }
}
