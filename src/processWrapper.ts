/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfdcUrl } from '@salesforce/core';

export const processWrapper = {
  AUTH_URL: process.env.SFDX_AUTH_URL,
  JWT_KEY: process.env.JWT_KEY,
  JWT_USERNAME: process.env.JWT_USERNAME,
  JWT_CLIENT_ID: process.env.JWT_CLIENT_ID,
  JWT_INSTANCE: process.env.JWT_INSTANCE ?? SfdcUrl.PRODUCTION,
};
