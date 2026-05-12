import { config } from '../config';
import { AuthAdapter } from '../adapters/AuthAdapter';
import { UserAdapter } from '../adapters/UserAdapter';
import { FleetAdapter } from '../adapters/FleetAdapter';
import { LoadAdapter } from '../adapters/LoadAdapter';
import { IAuthProvider } from '../interfaces/IAuthProvider';
import { IUserProvider } from '../interfaces/IUserProvider';
import { IFleetProvider } from '../interfaces/IFleetProvider';
import { ILoadProvider } from '../interfaces/ILoadProvider';

export class ServiceFactory {
  static createAuthProvider(): IAuthProvider {
    return new AuthAdapter(config.authServiceUrl || config.monolithUrl);
  }

  static createUserProvider(): IUserProvider {
    return new UserAdapter(config.userServiceUrl || config.monolithUrl);
  }

  static createFleetProvider(): IFleetProvider {
    return new FleetAdapter(config.fleetServiceUrl || config.monolithUrl);
  }

  static createLoadProvider(): ILoadProvider {
    return new LoadAdapter(config.loadServiceUrl || config.monolithUrl);
  }
}
