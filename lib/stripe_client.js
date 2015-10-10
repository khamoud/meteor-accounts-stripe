StripeOauth = {};

StripeOauth.requestCredential = function (options, credentialRequestCompleteCallback) {

    if (!credentialRequestCompleteCallback && typeof options === 'function') {
        credentialRequestCompleteCallback = options;
        options = {};
    }

    var config = ServiceConfiguration.configurations.findOne({ service: 'stripe' });
    if (!config) {
        credentialRequestCompleteCallback && credentialRequestCompleteCallback(new ServiceConfiguration.ConfigError());
        return;
    }

    var credentialToken = Random.id();
    var loginStyle = OAuth._loginStyle('stripe', config, options);
    var prefill = options && options.prefill ? '&' + $.param(options.prefill) : '';

    var loginUrl =
        'https://connect.stripe.com/oauth/authorize' +
            '?response_type=code' +
            '&client_id=' + config.appId +
            '&scope=' + config.scope +
            '&state=' + OAuth._stateParam(loginStyle, credentialToken) +
            prefill;

    OAuth.launchLogin({
      loginService: 'stripe',
      loginStyle: loginStyle,
      loginUrl: loginUrl,
      credentialRequestCompleteCallback: credentialRequestCompleteCallback,
      credentialToken: credentialToken
    });
};
