const _ = require("lodash");
const pluginId = require("../utils/pluginId");

const getFilterResult = (filter, valueToCheck) => {
  let result = true;
  if (filter) {
    if (filter.include) {
      result = filter.include.some((val) => val === valueToCheck);
    } else if (filter.exclude) {
      result = !filter.exclude.some((val) => val === valueToCheck);
    }
  }
  return result;
};

const replaceContents = (obj, excludedValues) =>
  _.mapKeys(obj, (value, key) => {
    if (excludedValues.includes(key)) {
      return "#_REDACTED_#";
    }
    return key;
  });

module.exports = ({ strapi }) => {
  strapi.server.use(async (ctx, next) => {
    await next();

    const config = strapi.config.get(`plugin.${pluginId}`);
    const endpoint = getFilterResult(config.filters.endpoint, ctx.url);
    const status = getFilterResult(config.filters.status, ctx.status);
    const method = getFilterResult(config.filters.method, ctx.method);

    if (endpoint && status && method) {
      const request = replaceContents(
        JSON.parse(JSON.stringify(ctx.request.body)),
        config.redactedValues,
      );
      const response = replaceContents(
        JSON.parse(JSON.stringify(ctx.response.body)),
        config.redactedValues,
      );

      const data = {
        user: ctx.state.user !== undefined ? ctx.state.user.email : "Anonymous",
        url: ctx.url,
        ip_address: ctx.ip,
        http_method: ctx.method,
        http_status: ctx.status,
        request_body: request,
        response_body: response,
      };

      strapi.entityService.create(`plugin::${pluginId}.log`, {
        data,
      });
    }
  });
};