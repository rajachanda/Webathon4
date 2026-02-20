module.exports = function override(config, env) {
  if (config.devServer) {
    delete config.devServer.onBeforeSetupMiddleware;
    delete config.devServer.onAfterSetupMiddleware;
    
    config.devServer.setupMiddlewares = (middlewares, devServer) => {
      return middlewares;
    };
  }
  return config;
};
