import {Provider} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {VerifyFunction} from 'loopback4-authentication';
import {UserRepository} from '../repositories';

export class LocalPasswordVerifyProvider
  implements Provider<VerifyFunction.LocalPasswordFn>
{
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  value(): VerifyFunction.LocalPasswordFn {
    return async (username: string, password: string) => {
      try {
        const user = await this.userRepository.findOne({where: {username}});
        if (!user) {
          throw new HttpErrors.NotFound(
            `User with username: ${username} does not exist`,
          );
        }

        if (user.password === password) {
          return user;
        } else {
          throw new HttpErrors.Unauthorized('Check username and password');
        }
      } catch (error) {
        console.log('error');
        throw new Error();
        // return user
      }
    };
  }
}
