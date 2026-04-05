import { writeSiteData } from "../lib/profiles.mjs";

writeSiteData()
  .then((profiles) => {
    process.stdout.write(`Generated ${profiles.length} profile entries in site-data.js\n`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
