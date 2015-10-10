StripeOauth = {};

Oauth.registerService('stripe', 2, null, function(query) {
  var tokenResponse = getTokenResponse(query);
  var accessToken = tokenResponse.accessToken;
  var refreshToken = tokenResponse.refreshToken;

  var identity = getIdentity(tokenResponse.stripe_id);
  var whitelisted = ['id', 'email', 'business_name', 'business_url', 'country', 'default_currency'];


  var serviceData = {
    accessToken: OAuth.sealSecret(accessToken),
    refreshToken: OAuth.sealSecret(refreshToken),
    stripe_publishable_key: tokenResponse.stripe_publishable_key,
  };

  var fields = _.pick(identity, whitelisted);
  _.extend(serviceData, fields);

  return {
    serviceData: serviceData,
    options: {profile: {name: identity.business_name}}
  };
});

// returns an object containing:
// - accessToken
// - expiresIn: lifetime of token in seconds
var getTokenResponse = function(query) {
  var config = ServiceConfiguration.configurations.findOne({service: 'stripe'});
  if (!config) {
    throw new ServiceConfiguration.ConfigError();
  }

  var responseContent;

  try {
    // Request an access token
    responseContent = HTTP.post('https://connect.stripe.com/oauth/token', {
      params: {
        client_secret: OAuth.openSecret(config.secret),
        code: query.code,
        grant_type: 'authorization_code'
      }
    }).content;

  } catch (err) {
    throw _.extend(new Error("Failed to complete OAuth handshake with Stripe. " + err.message), {
      response: err.response
    });
  }
  // Success!  Extract the stripe access token and key
  // from the response
  var parsedResponse = JSON.parse(responseContent);

  var stripeAccessToken = parsedResponse.access_token;
  var stripeRefreshToken = parsedResponse.refresh_token;
  var stripe_id = parsedResponse.stripe_user_id;
  var stripe_publishable_key = parsedResponse.stripe_publishable_key;

  if (!stripeAccessToken) {
    throw new Error("Failed to complete OAuth handshake with Stripe " +
      "-- can't find access token in HTTP response. " + responseContent);
  }
  return {
    accessToken: stripeAccessToken,
    refreshToken: stripeRefreshToken,
    stripe_id: stripe_id,
    stripe_publishable_key: stripe_publishable_key
  };
};

var getIdentity = function(stripe_id) {
  var config = ServiceConfiguration.configurations.findOne({service: 'stripe'});
  if (!config) {
    throw new ServiceConfiguration.ConfigError();
  }

  try {
    return HTTP.get('https://api.stripe.com/v1/accounts/' + stripe_id, {
      headers: {
        Authorization: 'Bearer ' + config.secret,
      }
    }).data;
  } catch (err) {
    throw _.extend(new Error("Failed to fetch identity from Stripe. " + err.message),
                   {response: err.response});
  }
};

StripeOauth.retrieveCredential = function(credentialToken) {
  return Oauth.retrieveCredential(credentialToken);
};
