import common from "./common";
import shell from "./shell";
import charts from "./charts";
import overview from "./overview";
import reports from "./reports";
import settings from "./settings";
import exports from "./exports";
import customize from "./customize";
import share from "./share";
import email from "./email";
import auth from "./auth";

export default {
  ...common,
  ...shell,
  ...charts,
  ...overview,
  ...reports,
  ...settings,
  ...exports,
  ...customize,
  ...share,
  ...email,
  ...auth,
};
