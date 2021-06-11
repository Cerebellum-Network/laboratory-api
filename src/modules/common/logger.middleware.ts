/* eslint-disable @typescript-eslint/explicit-member-accessibility */

import {Injectable} from '@nestjs/common';

@Injectable()
export class LoggerMiddleware {
  use(req, res, next) {
    console.log(`Request IP address: ${req.ip}`);
    next();
  }
}
