/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { AuthInfo, ConfigAggregator, ConfigInfo, fs } from '@salesforce/core';
import { processWrapper } from './processWrapper';

/**
 *
 * @param hubAlias the alias of the devhub you'd like to use OR the resulting alias of the devhub that'll be authorized if using authUrl/jwt.  Defaults to 'nutHub'
 * @param setDefault set the authorized hub to be the default.  Defaults to false
 */
export const hubAuth = async (hubAlias = 'nutHub', setAsDefault?: boolean): Promise<ConfigInfo | undefined> => {
  // do we have a configured hub already?  If so, we're good
  const aggregator = await ConfigAggregator.create();
  const configInfo = aggregator.getInfo('defaultdevhubusername');
  if (configInfo) {
    return configInfo;
  }

  // if not, look around the environment
  // case 1: authUrl
  if (processWrapper.AUTH_URL) {
    // auth the hub, set as default with hubAlias
    const oauth2Options = AuthInfo.parseSfdxAuthUrl(processWrapper.AUTH_URL);
    const authInfo = await AuthInfo.create({ oauth2Options });
    await authInfo.save();
    // will set to the default.
    await authInfo.setAlias(hubAlias);
    // export the config
    if (setAsDefault) {
      await authInfo.setAsDefault({
        defaultDevhubUsername: true,
      });
    }
    return aggregator.getInfo('defaultdevhubusername');
  }

  // case 2: jwt credentials
  if (processWrapper.JWT_CLIENT_ID && processWrapper.JWT_KEY && processWrapper.JWT_USERNAME) {
    const tmpKeyPath = 'tmpKeyPath';
    await fs.writeFile(tmpKeyPath, processWrapper.JWT_KEY);

    // TODO: actually auth
    await fs.remove(tmpKeyPath);
    throw new Error('jwt not implemented yet');
  }
};
